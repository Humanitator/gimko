export default class personPointer {
    constructor (person, before, isSpouse = false) {
        this.person = person;
        this.before = before;
        this.isSpouse = isSpouse;
    }
}