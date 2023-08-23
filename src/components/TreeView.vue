<script setup>
    import db from '@/firebase/init';
    import { getAuth } from 'firebase/auth';
    import { doc, getDoc, updateDoc } from 'firebase/firestore';
    import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import personPointer from '@/classes/personPointer.js';

    const router = useRouter();
    const tid = router.currentRoute.value.params.id; // ID of current tree

    const tPersonMarginH = 20;
    const tPersonMarginV = 20;
    const tPersonWidth = 160;
    const tPersonHeight = 80; 
    const tPersonPaddingH = 20;
    const tPersonPaddingV = 20; 

    const ftreePoses = ref([]);

    const personFormat = {
        name: "New Person",
        dob: '1920-01-02',
        dod: '1992-04-06',
        description: "",

        id: -1,
        parents: [null],
        children: [],
        spouses: [],
    };
    let currentPID;
    let biggestPID;

    // Get current tree
    let tree = ref();
    const getTree =  async () => {
        const treeDoc = await getDoc(doc(db, "trees", tid));
        if (treeDoc.exists()) {
            console.log("Tree found!");
            tree.value = treeDoc.data();
            // Set biggest PID
            biggestPID = 0;
            tree.value.people.forEach(person => {
                if (person.id >= biggestPID) {
                    biggestPID = person.id;
                }
            });

            // Make tree
            refreshTree();
        } else {
            console.log("Tree not found!");
            alert("Tree not found!");
            router.back();
        }
    };

    // Set the tree
    const updateTree = async () => {
        if (tree.value) {
            const treeDoc = doc(db, "trees", tid);
            await updateDoc(treeDoc, tree.value)
            .then(() => {
                console.log("Tree update success!");
            })
            .catch(() => {
                console.log("Tree update failed!");
                alert("Tree update failed!")
            });
        }
    }

    // Get person object from ID
    const getPerson = (ID) => {
        if (typeof ID == "object") {
            let arr = [];
            ID.forEach(id => {
                if (id == null) {
                    arr.push(null);
                    return arr;
                } else {
                    const person = tree.value.people.find(p => p.id == id);
                    arr.push(tree.value.people.find(p => p.id == id));
                }
            });
            return arr;
        } else {
            return tree.value.people.find(p => p.id == ID);
        }
    };

    // Get the depth of a person
    const getDepth = (startPerson) => {
        let depth = 0;
        
        let peopleToCheck = [startPerson];
        // let parentsToCheck = [...getPerson(startPerson.parents)];
        // let spousesToCheck = [...getPerson(startPerson.spouses)];

        let checkedPeople = [];
        let peoplePointers = [];

        let failsafe = 0; // DEBUG
        while (peopleToCheck.length != 0) {
            const checkPeople = [...peopleToCheck];
            peopleToCheck = [];
            // Check people
            checkPeople.forEach(person => {
                // Check parents
                getPerson(person.parents).forEach(parent => {
                    // Trace if null
                    if (parent == null) {
                        let pdepth = 0;
                        let tracePerson = person;
                        // Trace depth
                        while (tracePerson != startPerson) {
                            const pointer = peoplePointers.find(p => p.person == tracePerson);
                            tracePerson = pointer.before;
                            if (!pointer.isSpouse) {
                                pdepth++;
                            }
                        }
                        // Set depth
                        if (pdepth > depth) {
                            depth = pdepth;
                        }
                    } else if (!checkedPeople.includes(parent)) {
                        peoplePointers.push(new personPointer(parent, person));
                        peopleToCheck.push(parent);
                    }
                });

                // Check spouses
                getPerson(person.spouses).forEach(spouse => {
                    if (!checkedPeople.includes(spouse)) {
                        peoplePointers.push(new personPointer(spouse, person, true));
                        peopleToCheck.push(spouse);
                    }
                });

                // Add to checked
                checkedPeople.push(person);
            });
            failsafe++;
            if (failsafe > 1000) {
                break;
            }
        }

        return depth;
    };

    // Clalculate tree depth
    const treeDepth = ref(0);
    const calcTreeDepth = () => {
        let depth = 0;
        tree.value.people.forEach(person => {
            const pdepth = getDepth(person) + 1;
            if (pdepth > depth) {
                depth = pdepth;
            }
        });
        treeDepth.value = depth;
        // console.log("Tree depth:" + depth);
    };
    
    // Make full tree
    let ftree = ref();
    const makeTree = () => {
        if (tree.value.people.length == 0) {
            ftree.value = [];
            return;
        }
        ftree.value = [];
        for (let i = 0; i < treeDepth.value; i++) {
            ftree.value.push([]);
        }
        tree.value.people.forEach((person) => {
            ftree.value[getDepth(person)].push(person);
        });
        sortGen();
        // console.log(ftree.value);
    }

    // Refresh tree
    const refreshTree = () => {
        ftreePoses.value = [];
        tree.value.people.forEach((person, i) => {
            ftreePoses.value.push({
                pid: person.id,
                layer: null,
                index: null,
                x: null,
                y: null,
            });
        });
        calcTreeDepth();
        makeTree();

        closePersonInfo();
    };

    // Add a person to tree
    const newPerson = ref(structuredClone(personFormat));
    const addPerson = (personObj) => {
        if (personObj.name == "") {
            personObj.name = "New person";
        }
        // Set date
        personObj.dob = new Date(personObj.dob);
        personObj.dod = new Date(personObj.dod);
        
        // Set new id
        personObj.id = biggestPID + 1;
        biggestPID++;

        // Add person as child to all parents
        getPerson(personObj.parents).forEach(parent => {
            if (parent != null){
                parent.children.push(personObj.id);
            }
        });

        // Add person as spouse to spouses
        getPerson(personObj.spouses).forEach(spouse => {
            spouse.spouses.push(personObj.id);
        });

        // Add person to tree
        tree.value.people.push(structuredClone(personObj));
        console.log(tree.value.people); // Log tree

        // Reset person variable
        newPerson.value = structuredClone(personFormat);

        // Refresh
        refreshTree();
    };

    // Remove a perosn from the tree
    const removePerson = (pid) => {
        let person = getPerson(pid);

        // Remove children
        person.children.forEach(childID => {
            const child = getPerson(childID);
            child.parents.splice(child.parents.indexOf(person.id), 1);
            if (child.parents.length == 0) {
                // Add child to person's parents
                if (person.parents[0] != null) {
                    person.parents.forEach(parent => {
                        getPerson(parent).children.push(child.id);
                        child.parents.push(parent);
                    });
                } else {
                    child.parents.push(person.parents[0]);
                }
            }
        });

        // Remove spuoses
        person.spouses.forEach(spouseID => {
            const spouse = getPerson(spouseID);
            spouse.spouses.splice(spouse.spouses.indexOf(person.id), 1);
        });

        // Remove person from parents
        person.parents.forEach(parentID => {
            if (parentID != null) {
                const parent = getPerson(parentID);
                parent.children.splice(parent.children.indexOf(person.id), 1);
            }
        });

        // Remove from tree
        console.log(...tree.value.people);
        tree.value.people.splice(tree.value.people.indexOf(person), 1);
        console.log(...tree.value.people);
        
        // Refresh tree
        refreshTree();

        ftree.value.forEach(gen => {
            console.log("Gen");
            console.log(...gen);
        });
    }

    // Select a person type to add
    const adddingPerson = ref(false);
    const selectNewPersonType = (pid) => {
        currentPID = pid;
        adddingPerson.value = true;
    };

    // Add person of selected type
    const currentNewPersonType = ref("");
    const addPersonFromType = (type) => {
        currentNewPersonType.value = type;
    };

    // Add a child
    const addChild = (pid) => {
        // Check if PID exists
        if (pid == null) {
            pid = currentPID;
        }

        // Add the parent's spouses as parents
        newPerson.value.parents = [pid];
        getPerson(pid).spouses.forEach(spouseID => {
            newPerson.value.parents.push(spouseID);
        });
        addPerson(newPerson.value);
    };
    
    // Add a spouse
    const addSpouse = (pid) => {
        // Check if PID exists
        if (pid == null) {
            pid = currentPID;
        }

        // Add spuose's children as children
        newPerson.value.children = [...getPerson(pid).children];

        // Add the spuose spuoses as spuoses
        newPerson.value.spouses = [pid];
        getPerson(pid).spouses.forEach(spouseID => {
            newPerson.value.spouses.push(spouseID);
        });

        addPerson(newPerson.value);
    };

    // Sort generation by spuoses
    const sortGen = () => {
        if (ftree.value) {
            let newFTree = [];

            // OLD
            let lastGen = null;
            ftree.value.forEach(gen => {
                newFTree.push([]);
                const last = newFTree.length - 1;
                
                // Sort by spuoses
                let checkedIDs = [];
                gen.forEach(person => {
                    if (!checkedIDs.includes(person.id)) {
                        newFTree[last].push(person);
                        checkedIDs.push(person.id);
                        person.spouses.forEach(spuose => {
                            newFTree[last].push(getPerson(spuose));
                            checkedIDs.push(spuose);
                        });
                    }
                });
                
                // Align with parents
                if (lastGen) {
                    // Sort by families
                    let families = [];
                    let i = 0;
                    while (i < newFTree[last].length) {
                        families.push([newFTree[last][i].id, ...newFTree[last][i].spouses]);
                        i += newFTree[last][i].spouses.length + 1;
                    }

                    // Align with parents
                    newFTree[last] = [];
                    i = 0;
                    while (i < lastGen.length) { // Go through each "family head" (First person from family)
                        if (lastGen[i].children.length > 0) {
                            lastGen[i].children.forEach(child => {
                                const family = getPerson(families.find(f => f.find(p => p == child)));
                                newFTree[last].push(...family);
                            });
                        }
                        i += lastGen[i].spouses.length + 1;
                    }
                }

                lastGen = newFTree[last];
            });
            ftree.value = newFTree;
        }
    };

    // Show person info
    const selectedPerson = ref();
    const personIsSelected = ref(false);
    const showPersonInfo = (id) => {
        selectedPerson.value = tree.value.people.find(p => p.id == id);
        // console.log(selectedPerson.value);
        personIsSelected.value = true;
    };

    // Close person info
    const closePersonInfo = () => {
        personIsSelected.value = false;
        adddingPerson.value = false;
        currentNewPersonType.value = "";
        newPerson.value = structuredClone(personFormat);
        currentPID = null;
    };

    // Set person vertical position
    const setPersonPosV = (pid, i) => {
        const pos = (
                        i*(tPersonHeight + tPersonPaddingV*2 + tPersonMarginV*2)
                        + 200 // Remove offset
                    );
        ftreePoses.value.find(p => p.pid == pid).y = pos;
        ftreePoses.value.find(p => p.pid == pid).layer = i;
        return pos;
    }

    // Set person horizontal position
    const setPersonPosH = (pid, j, gen) => {
        const pos = (
            (gen.length - 1) * (tPersonWidth/2 + tPersonPaddingH + tPersonMarginH)
            - (j)*(tPersonWidth + tPersonPaddingH*2 + tPersonMarginH*2) // Add block offset
        );
        ftreePoses.value.find(p => p.pid == pid).x = pos;
        ftreePoses.value.find(p => p.pid == pid).index = j;
        return pos;
    }

    // Get a position pair
    const getPersonPos = (pid) => {
        return ftreePoses.value.find(p => p.pid == pid);
    };

    // Check if user has access to tree
    let hasAccess = ref(false);
    const checkAccess = async () => {
        const auth = getAuth();
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            console.log("User found!");
            if (userDoc.data().trees.includes(tid)) {
                hasAccess.value = true;
                console.log("Access granted!");  
            } else {
                console.log("User doesn't have access!");
                alert("You don't have access to view this tree!");
                router.push("/tree")
            }
        } else {
            console.log("User has no document!");
        }
    };

    onMounted(() => {
        document.title = "gimko | Tree view";
        checkAccess()
        if (hasAccess) {
            getTree();
        }
    });
</script>

<template>
    <!-- Checking access -->
    <div v-if="!hasAccess">
        <h1>Checking access...</h1>
    </div>

    <!-- Tree view -->
    <div v-if="hasAccess && tree">
        <h1>{{ tree.name }}</h1>

         <!-- Add new person
            <div class="add-person-intree-container" v-if="person.children == 0">
                <h3>Add person</h3>
                <p>Name: <input type="text" v-model="newPersName"></p>
                <button class="hover-up-p" @click="addPerson(person.id)">
                    <p>Add person</p>
                </button>
                <div class="bg"></div>
            </div> 
        -->

        <!-- People -->
        <div class="people-tree" v-if="tree.people.length > 0">
            <div class="tree-gen" v-for="(gen, i) in ftree">
                <div class="person" v-for="(person, j) in gen" v-bind:style="{
                    width: tPersonWidth + 'pt',
                    height: tPersonHeight + 'pt',
                    padding: tPersonPaddingV + 'pt ' + tPersonPaddingH + 'pt',
                    left: 'calc(50% - ' +
                        setPersonPosH(person.id, j, gen)
                     + 'pt)',
                    top: 'calc(' + setPersonPosV(person.id, i) + 'pt)',
                }">
                    <h2>{{ person.name }}</h2>
                    <div class="person-actions">
                        <button class="hover-up-p" @click="showPersonInfo(person.id)">
                            <p>INFO</p>
                            <div class="bg"></div>
                        </button>
                        <button class="hover-up-p" @click="selectNewPersonType(person.id)">
                            <p>ADD</p>
                            <div class="bg"></div>
                        </button>
                        <button class="hover-up-p" @click="removePerson(person.id)">
                            <p>Remove</p>
                            <div class="bg"></div>
                        </button>
                    </div>

                    <!-- Draw spouse line -->
                    <div v-if="(person.spouses.length > 0) && ((j == 0) || (!gen[j-1].spouses.includes(person.id)))" class="relation-line-container">
                        <hr class="relation-line" v-bind:style="{
                            left: 'calc(50% + ' + (
                                (person.spouses.length) * (tPersonWidth/2 + tPersonPaddingH + tPersonMarginH)
                            ) + 'pt)',
                            top: (
                                tPersonHeight/2 + tPersonPaddingV
                            ) + 'pt',
                            width: (
                                2 * (person.spouses.length) * (tPersonWidth/2 + tPersonPaddingH + tPersonMarginH)
                            ) + 'pt',
                        }" />
                    </div>

                    <!-- Draw relation lines -->
                    <div v-if="(person.spouses.length == 0) || (j == Math.round(gen.find(p => p.spouses.includes(person.id)).spouses.length/2))">
                        <hr v-for="child in person.children" class="relation-line" v-bind:style="{
                            left: 'calc(50% + ' + (
                                -(getPersonPos(child).x - getPersonPos(person.id).x)/2
                            ) + 'pt)',
                            top: 'calc(' + (
                               tPersonHeight + 2*tPersonPaddingV + tPersonMarginV
                            ) + 'pt)',
                            transform: 'translateX(-50%) rotate(' + (
                                -Math.atan(
                                    (2*tPersonMarginV + 40) / 
                                    (getPersonPos(child).x - getPersonPos(person.id).x)
                                )
                            ) + 'rad)',
                            width: Math.sqrt(
                                ((getPersonPos(child).x - getPersonPos(person.id).x))**2 + 
                                (2 * tPersonMarginV + 40)**2
                            ) + 'pt',
                        }" />
                    </div>

                    <div class="bg"></div>
                </div>
            </div>
        </div>

        <!-- Draw relation lines -->
        <div class="relation-line-container">
            <div class="external-person-container" v-for="person in tree.people">
                <!-- Draw lines to children -->
                <!-- <hr v-for="child in person.children" class="relation-line" v-bind:style="{
                    left: 'calc(50% + ' + (
                        getPersonPos(person.id).x
                        + (getPersonPos(child).x - getPersonPos(person.id).x)/2
                    ) + 'pt)',
                    top: 'calc(' + (
                        (getPersonPos(person.id).y + (getPersonPos(child).y - getPersonPos(person.id).y)/2) +
                        ((tPersonHeight/2) * -(1 - 1/(Math.abs(getPersonPos(child).x) + 1))) // Add vertical offset
                    ) + 'pt)',
                    transform: 'translateX(-50%) rotate(' + (
                        Math.atan(
                            (getPersonPos(child).y - getPersonPos(person.id).y) / 
                            (getPersonPos(child).x - getPersonPos(person.id).x)
                        )
                    ) + 'rad)',
                    width: Math.sqrt(
                        ((getPersonPos(child).x - getPersonPos(person.id).x))**2 + 
                        ((getPersonPos(child).y - getPersonPos(person.id).y))**2 
                    ) + 'pt',
                }" /> -->
            </div>
        </div>

        <!-- Person info -->
        <div class="selected-person-info" v-bind:class="(personIsSelected)?'shown':''">
            <h2 v-if="selectedPerson">{{ selectedPerson.name }} ({{ selectedPerson.dob.getFullYear() }} - {{ selectedPerson.dod.getFullYear() }})</h2>
            <article v-if="selectedPerson">
                <p> {{ selectedPerson.description }} </p>
            </article>

            <button class="exit-button hover-up-p" @click="closePersonInfo()">
                <p>Close</p>
                <div class="bg"></div>
            </button>
        </div>

        <!-- Select person type -->
        <div class="select-person-type-container" v-bind:class="(currentNewPersonType == '' && adddingPerson)?'shown-0':''">
            <h2>Select person type</h2>

            <button class="select-new-person-button hover-up-p" @click="addPersonFromType('child')">
                <p>Child</p>
                <div class="bg op-50"></div>
            </button>

            <button class="select-new-person-button hover-up-p" @click="addPersonFromType('spouse')">
                <p>Spouse</p>
                <div class="bg op-50"></div>
            </button>

            <button class="exit-button hover-up-p" @click="closePersonInfo()">
                <p>Close</p>
                <div class="bg op-50"></div>
            </button>

            <div class="bg"></div>
        </div>

        <!-- Add person from type -->
        <div class="add-person-from-type-container" v-bind:class="(currentNewPersonType != '')?'shown':''">
            <h2>Add a {{ currentNewPersonType }}</h2>
            <!-- Add form -->
            <div class="add-person-form">
                <p>Name: <input v-model="newPerson.name" type="text" /></p> <!-- Name -->
                <p>Date of birth: <input v-model="newPerson.dob" type="date" /></p> <!-- Date of birth -->
                <p>Date of death: <input v-model="newPerson.dod" type="date" /></p> <!-- Date of death -->
                <p><label for="new-person-description">Description: </label></p> <!-- Description -->
                <p><textarea class="desc" id="new-person-description" name="Description" v-model="newPerson.description"></textarea></p>
                <button class="hover-up-p" @click="(currentNewPersonType == 'child')?addChild():addSpouse()">
                    <p>ADD</p>
                    <div class="bg"></div>
                </button>
            </div>

            <!-- Exit -->
            <button class="exit-button hover-up-p" @click="closePersonInfo()">
                <p>Close</p>
                <div class="bg accent"></div>
            </button>
        </div>

        <!-- UPDATE TREE -->
        <button class="exit-button hover-up-p" v-if="tree.people.length != 0" @click="updateTree()">
            <p>Update Tree</p>
            <div class="bg accent"></div>
        </button>
       
        <!--  IF NO PERON EXISTS -->
        <!-- Add new person form -->
        <div class="add-person-container" v-if="tree.people.length == 0">
            <h2>Add a person</h2>
            <p>Name: <input type="text" v-model="newPerson.name"></p>
            <p>Date of birth: <input type="date" v-model="newPerson.dob"></p>
            <p>Date of death: <input type="date" v-model="newPerson.dod"></p>
            <button class="hover-up-p" @click="addPerson(newPerson)">
                <p>Create person</p>
            </button>

            <div class="bg"></div>
        </div>
    </div>
</template>

<style lang="scss">
    @import "../assets/css/tree.scss";
</style>