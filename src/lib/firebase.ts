import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { FontProject } from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA9099qjFYv94fSAprTMucAOa4FLXTdZ10",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-1561977292-d7c87.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-1561977292-d7c87",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-1561977292-d7c87.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "782834835598",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:782834835598:web:dac6e46669f91644e5e9df",
};

// Singleton App & Firestore
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface CloudProjectSummary {
  id: string;
  name: string;
  glyphCount: number;
  updatedAt: number;
}

/**
 * Saves or updates a font project in Firebase Firestore.
 */
export async function saveProjectToCloud(project: FontProject): Promise<{ success: boolean; id: string; updatedAt: number }> {
  try {
    const projectId = project.id || `proj_${Date.now()}`;
    const docRef = doc(db, 'font_projects', projectId);

    const now = Date.now();
    const glyphCount = Object.keys(project.glyphs || {}).length;

    const dataToSave = {
      ...project,
      id: projectId,
      glyphCount,
      updatedAt: now,
      serverUpdatedAt: serverTimestamp(),
    };

    await setDoc(docRef, dataToSave, { merge: true });
    return { success: true, id: projectId, updatedAt: now };
  } catch (error) {
    console.error('Error saving font project to Firebase Firestore:', error);
    throw error;
  }
}

/**
 * Loads a font project from Firebase Firestore by ID.
 */
export async function loadProjectFromCloud(projectId: string): Promise<FontProject | null> {
  try {
    const docRef = doc(db, 'font_projects', projectId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as FontProject;
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error loading font project from Firebase Firestore:', error);
    throw error;
  }
}

/**
 * Fetches recent font projects saved in Firebase Firestore.
 */
export async function listCloudProjects(): Promise<CloudProjectSummary[]> {
  try {
    const colRef = collection(db, 'font_projects');
    const q = query(colRef, orderBy('updatedAt', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);

    const projects: CloudProjectSummary[] = [];
    querySnapshot.forEach((doc) => {
      const d = doc.data();
      projects.push({
        id: doc.id,
        name: d.name || 'Sin título',
        glyphCount: d.glyphCount ?? Object.keys(d.glyphs || {}).length,
        updatedAt: d.updatedAt || Date.now(),
      });
    });

    return projects;
  } catch (error) {
    console.error('Error listing font projects from Firebase Firestore:', error);
    return [];
  }
}

/**
 * Deletes a project from Firebase Firestore.
 */
export async function deleteProjectFromCloud(projectId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'font_projects', projectId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting project from Firebase:', error);
    return false;
  }
}
