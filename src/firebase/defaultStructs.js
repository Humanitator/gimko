// This file contains default structures for objects

// Default struct for user
export const defaultUser = {
    username: "",
    friends: [],
    trees: [],
    sentFriendReq: [],
    incomingFriendReq: [],
}

// Default struct for tree
export const defaultTree = {
    name: "",
    ownerID: "",
    isPublic: false,
    people: [],
}

export const defaultPersonArticle = {
    title: "New article",
    content: "Something about the person",
}

// Default struct for person in tree
export const defaultTreePerson = {
    name: "New Person",
    dob: '1920-01-02',
    dod: '1992-04-06',
    isDeceased: false,
    articles: [
        structuredClone(defaultPersonArticle),
    ],

    id: -1,
    parents: [null],
    primaryParents: [-1],
    children: [],
    spouses: [],
}