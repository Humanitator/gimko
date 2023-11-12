import db from "./init";
import { doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

// Get document safely
export const safeGetDoc = async (path, docName) => {
    console.log(("Getting document: " + docName));
    const docInst = await getDoc(doc(db, path, docName));

    if (docInst.exists()) {
        return docInst;
    } else {
        console.log("Document not found!");
        return null
    }
};

// Get all documents safely
export const safeGetAllDocs = async (collectionName) => {
    console.log(("Getting all documents: " + collectionName));
    const colRef = collection(db, collectionName);

    const querySnapshot = await getDocs(colRef);
    querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
    });
    return querySnapshot;
};

// Update document safely
export const safeUpdateDoc = async (path, docName, newValues) => {
    console.log("Updating document: " + docName);
    await updateDoc(doc(db, path, docName), newValues);
};

// Set document safely
export const safeSetDoc = async (path, docName, newValue) => {
    console.log("Setting document: " + docName);
    await setDoc(doc(db, path, docName), newValue);
};