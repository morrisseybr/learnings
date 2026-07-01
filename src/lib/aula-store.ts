import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, type DocumentData, type Firestore } from "firebase-admin/firestore";

import { lessonFrontmatter } from "./frontmatter";
import { compare } from "./site-model";
import type { AulaData, AulaStore, CourseListing } from "./aula-io";

/**
 * The Firestore read/write adapter behind the local MCP server — the *only*
 * place the AI's authoring I/O touches the database (ADR 0006). It implements
 * the `AulaStore` port the Aula tools depend on, translating the domain Aula
 * (Frontmatter object + `mdx` + `esbocos[]`) to and from the document shape
 * (`courses/{course}/lessons/{slug}`, Frontmatter promoted to fields — ADR 0005).
 *
 * Credentials name the **read/write** service account, two ways:
 *   - `FIRESTORE_ADMIN_KEY` — path to the service account JSON; when set, it is
 *     loaded with `cert()` (it is a file *path*, never the JSON contents);
 *   - otherwise Application Default Credentials, which honor the standard
 *     `GOOGLE_APPLICATION_CREDENTIALS` env var (also a path) or the ambient
 *     gcloud/App Hosting identity.
 *
 * This is deliberately NOT the SSR adapter (`firestore.ts`), which reads
 * `FIRESTORE_SA_KEY` (the **read-only** account for the public web surface).
 * Merging the two would risk handing the public read path a writer credential —
 * the exact role split ADR 0006 keeps. The Security Rules deny all client
 * access; only these Admin SDK paths read or write.
 */
function db(): Firestore {
  if (getApps().length === 0) {
    const keyPath = process.env.FIRESTORE_ADMIN_KEY;
    initializeApp({
      credential: keyPath ? cert(keyPath) : applicationDefault(),
    });
  }
  return getFirestore();
}

// The Frontmatter fields, promoted to first-class document fields alongside
// `mdx`/`esbocos`. Derived from the single Frontmatter schema so the fields the
// store reads back can never drift from what the validator accepts.
const FRONTMATTER_FIELDS = Object.keys(lessonFrontmatter.shape) as (keyof typeof lessonFrontmatter.shape)[];

// The Course's human title, or `null` when absent/blank — the same rule the SSR
// adapter uses, so a Course listed here matches how the web surface titles it.
function titleField(data: DocumentData | undefined): string | null {
  const title = data?.title;
  return typeof title === "string" && title.trim() !== "" ? title : null;
}

// Split a stored Lesson document back into the domain Aula: the known
// Frontmatter fields, the `mdx` body, and the `esbocos[]` binding.
function toAulaData(data: DocumentData): AulaData {
  const frontmatter: Record<string, unknown> = {};
  for (const field of FRONTMATTER_FIELDS) {
    if (data[field] !== undefined) frontmatter[field] = data[field];
  }
  return {
    frontmatter,
    mdx: typeof data.mdx === "string" ? data.mdx : "",
    esbocos: Array.isArray(data.esbocos) ? data.esbocos : [],
  };
}

/**
 * The Firestore-backed `AulaStore`. A single instance is created by the MCP
 * server; every tool call goes through it.
 */
export class FirestoreAulaStore implements AulaStore {
  async listCourses(): Promise<CourseListing[]> {
    const firestore = db();
    const [courseSnap, lessonSnap] = await Promise.all([
      firestore.collection("courses").get(),
      firestore.collectionGroup("lessons").select("title", "order").get(),
    ]);

    const listings = new Map<string, CourseListing>();
    for (const doc of courseSnap.docs) {
      listings.set(doc.id, {
        course: doc.id,
        title: titleField(doc.data()) ?? doc.id,
        lessons: [],
      });
    }

    for (const doc of lessonSnap.docs) {
      // A `lessons` doc lives at courses/{course}/lessons/{slug}; its grandparent
      // is the Course document. Skip a stray top-level `lessons` collection and a
      // Lesson whose Course document is missing — the Course list is the source
      // of truth for what exists, exactly as the site model treats it.
      const courseDoc = doc.ref.parent.parent;
      const listing = courseDoc ? listings.get(courseDoc.id) : undefined;
      if (!listing) continue;
      const data = doc.data();
      listing.lessons.push({
        slug: doc.id,
        title: typeof data.title === "string" ? data.title : doc.id,
        order: typeof data.order === "number" ? data.order : 0,
      });
    }

    // Unlike the public hub (`buildSiteModel` drops empty Courses), the authoring
    // list keeps every Course — the Professor may want to see a Course to write
    // its first Aula into. Ordering matches the hub: Courses by id, Lessons by
    // `order` with slug as the stable tiebreak (shared `compare`, so the rule
    // never diverges from the read path).
    for (const listing of listings.values()) {
      listing.lessons.sort((a, b) => a.order - b.order || compare(a.slug, b.slug));
    }
    return [...listings.values()].sort((a, b) => compare(a.course, b.course));
  }

  async readAula(course: string, slug: string): Promise<AulaData | null> {
    const snap = await lessonRef(course, slug).get();
    if (!snap.exists) return null;
    return toAulaData(snap.data() ?? {});
  }

  async writeAula(course: string, slug: string, data: AulaData): Promise<void> {
    const firestore = db();
    // Ensure the Course document exists, or the Aula never surfaces in listings
    // (the site model drops a Lesson whose Course record is missing). An empty
    // `merge` set creates the doc without touching an existing `title`; no reader
    // consumes a stored `name` field (the Course id comes from the doc id), so
    // writing one would only add dead data. The human title is set elsewhere and
    // falls back to the id until then.
    await firestore.collection("courses").doc(course).set({}, { merge: true });

    await firestore
      .collection("courses")
      .doc(course)
      .collection("lessons")
      .doc(slug)
      .set({ ...data.frontmatter, mdx: data.mdx, esbocos: data.esbocos });
  }

  async deleteAula(course: string, slug: string): Promise<boolean> {
    const ref = lessonRef(course, slug);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }
}

function lessonRef(course: string, slug: string) {
  return db().collection("courses").doc(course).collection("lessons").doc(slug);
}
