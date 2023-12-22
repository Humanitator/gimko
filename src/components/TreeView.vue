<script setup>
    import db from '@/firebase/init';
    import { getAuth } from 'firebase/auth';
    import { doc, getDoc, updateDoc } from 'firebase/firestore';
    import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import personPointer from '@/classes/personPointer.js';
    import { defaultTreePerson, defaultPersonArticle } from '@/firebase/defaultStructs';

    const router = useRouter();
    const tid = router.currentRoute.value.params.id; // ID of current tree

    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    const tPersonMarginH = 20;
    const tPersonMarginV = 20;
    const tPersonWidth = 160;
    const tPersonHeight = 80; 
    const tPersonPaddingH = 20;
    const tPersonPaddingV = 20; 
    let offsetX = ref(0); // The pan offset

    const ftreePoses = ref([]);

    const personFormat = structuredClone(defaultTreePerson);
    let currentPID;
    let biggestPID;

    let auth = getAuth();

    // Get current tree
    let tree = ref();
    const getTree =  async () => {
        console.log("Getting Tree");
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

            console.log(tree.value.people);
            
            // Set dates
            // tree.value.people.forEach(person => {
            //     person.dob = new Date(person.dob);
            //     person.dod = new Date(person.dod);
            // });

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
            let formattedTree = structuredClone(tree.value);
            // Format tree to json
            formattedTree.people.forEach(person => {
                // person.dob = person.dob.toJSON();
                // person.dod = person.dod.toJSON();
            });

            // Update tree document
            await updateDoc(treeDoc, formattedTree)
            .then(() => {
                console.log("Tree update success!");
                showError("Saglabāts sekmīgi!")
            })
            .catch(() => {
                console.log("Tree update failed!");
                showError("Neizdevās saglabāt!")
            });
        }
    }

    // Get person object from ID
    /**
        * Arguments can be INT or ARRAY
    */
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
        calcTreeWidth();
        closePersonInfo();

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
                    // Sort by families (With primary person in first)
                    let families = [];
                    let i = 0;
                    while (i < newFTree[last].length) {
                        // Get primary person
                        let j = i;
                        let primPers = newFTree[last][j];
                        while (primPers.primaryParents.length == 0) {
                            primPers = newFTree[last][j];
                            j++;
                        }

                        families.push([primPers]);
                        primPers.spouses.forEach(s => {
                            families[families.length-1].push(getPerson(s));
                        });

                        i += primPers.spouses.length + 1;
                    }

                    // Align with parents
                    newFTree[last] = [];
                    // NEW
                    i = 0;
                    while (i < lastGen.length) {
                        const parent = lastGen[i];
                        let familyIndex = 1;
                        // Different cases for adopted people
                        if (parent.primaryParents.length > 0) { // Add adopted people (If parent is main)
                            while (familyIndex > -1) {
                                familyIndex = families.findIndex(f => f[0].primaryParents[0] == -1 && f[0].primaryParents[1] == parent.id);
                                if (familyIndex > -1) {
                                    // Move primary to middle of family
                                    const primPers = families[familyIndex][0];
                                    families[familyIndex][0] = families[familyIndex][Math.floor((families[familyIndex].length - 1) / 2)];
                                    families[familyIndex][Math.floor((families[familyIndex].length - 1) / 2)] = primPers;

                                    // Add family to gen
                                    newFTree[last].push(...families[familyIndex]);
                                    families.splice(familyIndex, 1);
                                }
                            }
                        } else { // If parent is a spouse
                            while (familyIndex > -1) {
                                familyIndex = families.findIndex(f => f[0].primaryParents[0] == parent.id);
                                if (familyIndex > -1) {
                                    // Move primary to middle of family
                                    const primPers = families[familyIndex][0];
                                    families[familyIndex][0] = families[familyIndex][Math.floor((families[familyIndex].length - 1) / 2)];
                                    families[familyIndex][Math.floor((families[familyIndex].length - 1) / 2)] = primPers;

                                    // Add family to gen
                                    newFTree[last].push(...families[familyIndex]);
                                    families.splice(familyIndex, 1);
                                }
                            }
                        }
                        i++;
                    }

                }

                lastGen = newFTree[last];
            });
            ftree.value = newFTree;
        }
        // console.log(ftree.value);
        // console.log(tree.value);
    };

    // Add a person to tree
    const newPerson = ref(structuredClone(personFormat));
    /** Adds ID, person as parent to it's children, person as spouse to it's spouses */
    const addPerson = (personObj) => {
        if (personObj.name == "") {
            personObj.name = "New person";
        }
        // Set date
        // personObj.dob = new Date(personObj.dob);
        // personObj.dod = new Date(personObj.dod);
        
        // Set new id
        personObj.id = biggestPID + 1;
        biggestPID++;

        // Add person to tree
        tree.value.people.push(structuredClone(personObj));
        // console.log(tree.value.people); // Log tree

        // Reset person variable
        newPerson.value = structuredClone(personFormat);

        // Refresh
        refreshTree();
    };

    // Remove a person from the tree
    const removePID = ref();
    const removePerson = (pid) => {
        let person = getPerson(pid);

        // If person is primary
        if (person.primaryParents.length > 1) {
            // Move children up to first parent
            let primParent = getPerson(person.primaryParents[1]);

            // Set parent for children
            getPerson(person.children).forEach(child => {
                // Remove person as parent
                child.parents.splice(child.parents.indexOf(person.id), 1);

                // Add parents to child
                child.parents.push(...person.parents);

                // Set primary parents to adopted
                child.primaryParents[0] = -1;
                child.primaryParents[1] = primParent.id;
            });

            // Add children to person's parent
            primParent.children.push(...person.children);

            // Remove person from parent
            primParent.children.splice(primParent.children.indexOf(person.id), 1);

            // Move spouses up
            primParent.spouses.push(...person.spouses);
            getPerson(person.spouses).forEach(spouse => {
                // Remove person
                spouse.spouses.splice(spouse.spouses.indexOf(person.id), 1);
                // Add parent as spouse
                spouse.spouses.push(...primParent.spouses);
            });

            // Add spouses to parent spouses (all other parents)
            getPerson(primParent.spouses).forEach(spouse => {
                spouse.spouses.push(...person.spouses);
            });

        } else if (person.primaryParents.length > 0) { // If person is primary AND is at top of tree
            if (person.children.length > 1) {
                console.error("Can't remove first main person, if has > 1 child!");
                showError("Nevar dzēst pirmo koka personu, ja tam ir vairāki bērni!");
                return false;
            } else if (person.children.length == 1) {
                // Configure child
                let child = getPerson(person.children[0])

                // Remove parents
                child.parents = [null];
                child.primaryParents = [-1];

                // Add spouses
                child.spouses.push(...person.spouses);
            }
        } else { // If person is a spouse (isn't primary)
            // Remove from spouses
            getPerson(person.spouses).forEach(spouse => {
                spouse.spouses.splice(spouse.spouses.indexOf(person.id), 1);
            });

            // Remove from children
            getPerson(person.children).forEach(child => {
                child.parents.splice(child.parents.indexOf(person.id), 1);
                // Make child to adopted
                if (child.primaryParents[0] == person.id) {
                    child.primaryParents[0] = -1;
                }
            });
        }

        // Remove from tree
        tree.value.people.splice(tree.value.people.indexOf(person), 1);
        
        // Refresh tree
        refreshTree();
    }

    // Confirm a edit
    const confirmEdit = () => {
        // Overwrite
        tree.value.people[tree.value.people.indexOf(getPerson(editedPerson.value.id))] = editedPerson.value;
        // console.log(tree.value.people);

        console.log("Person edit success!");
        // Refresh tree
        closePersonInfo();
        refreshTree();
    };

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
        let person = getPerson(pid);

        // Add the parent's spouses as parents
        newPerson.value.parents = [pid];
        person.spouses.forEach(spouseID => {
            newPerson.value.parents.push(spouseID);
        });

        // Add as child to parents
        getPerson(newPerson.value.parents).forEach(parent => {
            parent.children.push(biggestPID + 1);
        });

        // Add primary parents
        newPerson.value.primaryParents.push(currentPID);

        addPerson(newPerson.value);
    };
    
    // Add a spouse
    const addSpouse = (pid) => {
        // Check if PID exists
        if (pid == null) {
            pid = currentPID;
        }
        // Get the person
        let person = getPerson(pid);

        // Remove parents
        newPerson.value.primaryParents = [];

        // Add the spuose spuoses as spuoses
        newPerson.value.spouses = [pid];
        getPerson(pid).spouses.forEach(spouseID => {
            newPerson.value.spouses.push(spouseID);
            getPerson(spouseID).spouses.push(biggestPID+1);
        });

        // Add spuose's children as children
        newPerson.value.children = [...person.children];

        // Add spouse as parent to children
        getPerson(newPerson.value.children).forEach(child => {
            child.parents.push(biggestPID + 1);
        });

        person.spouses.push(biggestPID + 1);

        addPerson(newPerson.value);
    };

    // Add a parent to a person
    const addParent = (pid) => {
        // Check if PID exists
        if (pid == null) {
            pid = currentPID;
        }
        
        // Get person
        let person = getPerson(pid);

        // Add person as child
        newPerson.value.children.push(person.id);

        // If person is the root person
        if (person.primaryParents.length < 2) {
            // Set primary parent
            person.primaryParents.push(biggestPID+1);
            
        } else { // If person is a random primary parent (not root)
            // Configure person parents
            newPerson.value.parents = [];
            getPerson(person.parents).forEach(parent => {
                // Remove old child from parents
                parent.children.splice(parent.children.indexOf(person.id), 1);

                // Add as child to parents
                parent.children.push(biggestPID + 1);

                // Add parent
                newPerson.value.parents.push(parent.id);
            });

            // Add primary parents
            newPerson.value.primaryParents.push(person.primaryParents[1]);
            person.primaryParents[0] = -1;
            person.primaryParents[1] = biggestPID + 1;
        }

        // Remove old parents from person
        person.parents = [biggestPID + 1];

        // Add to tree
        addPerson(newPerson.value);
    };

    // Add an article
    const addArticle = (person) => {
        person.articles.push(structuredClone(defaultPersonArticle));
    };

    // Remove an article
    const removeArticle = (person, index) => {
        person.articles.splice(index);
    };

    // Show person info
    const selectedPerson = ref();
    const personIsSelected = ref(false);
    const showPersonInfo = (id) => {
        selectedPerson.value = tree.value.people.find(p => p.id == id);
        // console.log(selectedPerson.value);
        personIsSelected.value = true;
    };

    // Edit person info
    const editingPerson = ref(false);
    const editedPerson = ref();
    const editPerson = (id) => {
        closePersonInfo();
        editedPerson.value = structuredClone(tree.value.people.find(p => p.id == id));
        editingPerson.value = true;
    };

    // Close person info
    const closePersonInfo = () => {
        personIsSelected.value = false;
        adddingPerson.value = false;
        editingPerson.value = false;
        currentNewPersonType.value = "";
        newPerson.value = structuredClone(personFormat);
        editedPerson.value = null;
        removePID.value = null;
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

    let treeWidthPt = 0;
    const calcTreeWidth = () => {
        treeWidthPt = 0;
        if (ftree.value) {
            // Get longest gen
            ftree.value.forEach(gen => {
                if (gen.length > treeWidthPt) {
                    treeWidthPt = gen.length;
                }
            });
            treeWidthPt = (
                (treeWidthPt - 1) * (tPersonWidth/2 + tPersonPaddingH + tPersonMarginH)
                - (0)*(tPersonWidth + tPersonPaddingH*2 + tPersonMarginH*2) // Add block offset
            );
        }
    };

    // Get a position pair
    const getPersonPos = (pid) => {
        return ftreePoses.value.find(p => p.pid == pid);
    };

    // Show a error message
    const errorMsg = ref("");
    const errorMsgDurationMlsc = 2000;
    const showError = async (errorMessage) => {
        errorMsg.value = errorMessage;
        setTimeout(function() {
            errorMsg.value = "";
        }, errorMsgDurationMlsc);
    };

    // Check if user has access to tree
    let hasAccess = ref(false);
    const checkAccess = async () => {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            console.log("User found!");
            if (userDoc.data().trees.includes(tid)) {
                hasAccess.value = true;
                console.log("Access granted!");  
            } else {
                console.log("User doesn't have access!");
                alert("Jums nav piekļuves šajam kokam!");
                router.push("/tree")
            }
        } else {
            console.log("User has no document!");
        }
    };

    let mouseDown = 0;
    window.onmousedown = () => {
        ++mouseDown;
    }
    window.onmouseup = () => {
        --mouseDown;
    }

    let lastX;
    const handleMouseMove = (event) => {
        if (mouseDown) {
            const x = event.screenX;

            if (lastX) {
                let dx = x - lastX;
                offsetX.value += dx;
                offsetX.value = clamp(offsetX.value, -treeWidthPt * 2, treeWidthPt * 2)
                // console.log(offsetX.value);
            }

            lastX = x;
        } else {
            lastX = null;
        }
    }

    onMounted(async () => {
        document.title = "gimko | Koka skats";
        await checkAccess();
        if (hasAccess.value) {
            getTree();
        }
    });

    document.onmousemove = handleMouseMove;
</script>

<template>
    <!-- Checking access -->
    <div v-if="!hasAccess">
        <h1>Pārbauda piekļuves atļauju...</h1>
    </div>

    <!-- Tree view -->
    <div v-if="hasAccess && tree && ftree" class="prevent-select" style="position: relative;">
        <h1>{{ tree.name }}</h1>

        <!-- People -->
        <div class="people-tree" v-if="tree.people.length > 0" :style="{ left: offsetX + 'px' }">
            <div class="tree-gen" v-for="(gen, i) in ftree">
                <div class="person" v-for="(person, j) in gen" :style="{
                    width: tPersonWidth + 'pt',
                    height: tPersonHeight + 'pt',
                    padding: tPersonPaddingV + 'pt ' + tPersonPaddingH + 'pt',
                    left: 'calc(50% - ' +
                        setPersonPosH(person.id, j, gen)
                     + 'pt)',
                    top: 'calc(' + setPersonPosV(person.id, i) + 'pt)',
                }">
                    <h2 style="position: relative;" class="z-5" :class="(person.primaryParents.length > 0)?'t-bg':'t-text'">{{ person.name }}</h2>
                    <div class="person-actions">
                        <!-- Info view -->
                        <button class="hover-up-p" @click="showPersonInfo(person.id)">
                            <p>INFO</p>
                            <div class="bg secondary op-50"></div>
                        </button>
                        <!-- Add (Only for primary) -->
                        <button v-if="person.primaryParents.length > 0" class="hover-up-p" @click="selectNewPersonType(person.id)"> 
                            <p>PIEVIENOT</p>
                            <div class="bg secondary op-50"></div>
                        </button>
                        <!-- Remove person -->
                        <button class="hover-up-p" @click="() => removePID = person.id">
                            <p>DZĒST</p>
                            <div class="bg red op-80"></div>
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
                    <!-- --- NEW --- (Draw actual relations) -->
                    <!-- Lines are drawn from child to parent (DOWN -> UP) -->
                    <div v-if="person.primaryParents.length > 1">
                        <hr class="relation-line" v-bind:style="{
                            left: 'calc(50% + ' + (
                                -(getPersonPos((person.primaryParents[0] > -1)?person.primaryParents[0]:person.primaryParents[1]).x - getPersonPos(person.id).x)/2
                            ) + 'pt)',
                            top: 'calc(' + (
                            //    -tPersonHeight - 2*tPersonPaddingV - tPersonMarginV
                                -20
                            ) + 'pt)',
                            transform: 'translateX(-50%) rotate(' + (
                                -Math.atan(
                                    (2*tPersonMarginV) / 
                                    -(getPersonPos((person.primaryParents[0] > -1)?person.primaryParents[0]:person.primaryParents[1]).x - getPersonPos(person.id).x)
                                )
                            ) + 'rad)',
                            width: Math.sqrt(
                                ((getPersonPos((person.primaryParents[0] > -1)?person.primaryParents[0]:person.primaryParents[1]).x - getPersonPos(person.id).x))**2 + 
                                (2 * tPersonMarginV)**2
                            ) + 'pt',
                        }" />
                    </div>

                    <!-- --- OLD --- (draw lines from middle parent) -->
                    <!-- Lines are drawn from parent to child (UP -> DOWN) -->
                    <!-- <div v-if="(person.spouses.length == 0) || (j == Math.round(gen.indexOf(gen.find(p => p.spouses.includes(person.id))) + gen.find(p => p.spouses.includes(person.id)).spouses.length/2))">
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
                    </div> -->

                    <div class="bg z-1" :class="(person.primaryParents.length > 0)?'accent':''"></div>
                </div>
            </div>
        </div>

        <!-- Person info -->
        <div class="selected-person-info" v-bind:class="(personIsSelected)?'shown':''">
            <h2 v-if="selectedPerson && selectedPerson.isDeceased">{{ selectedPerson.name }} ({{ new Date(selectedPerson.dob).getFullYear() }} - {{ new Date(selectedPerson.dod).getFullYear() }})</h2>
            <h2 v-if="selectedPerson && !selectedPerson.isDeceased">{{ selectedPerson.name }} ({{ new Date(selectedPerson.dob).getFullYear() }})</h2>

            <!-- Articles -->
            <div v-if="selectedPerson" v-for="article in selectedPerson.articles">
                <h5>{{ article.title }}</h5>
                <article >
                    <p> {{ article.content }} </p>
                </article>
            </div>

            <button class="edit-button hover-up-p" @click="editPerson(selectedPerson.id)">
                <p>REDIĢĒT</p>
                <div class="bg accent op-30"></div>
            </button>

            <button class="exit-button hover-up-p" @click="closePersonInfo()">
                <p>AIZVĒRT</p>
                <div class="bg"></div>
            </button>
        </div>

        <!-- Edit person info -->
        <div class="edit-person-info-container" v-bind:class="(editingPerson)?'shown':''">
            <h2>Rediģēt personas info</h2>
            <!-- Add form -->
            <div class="add-person-form" v-if="editedPerson">
                <p>Vārds: <input v-model="editedPerson.name" type="text" /></p> <!-- Name -->
                <p>Dzimšanas datums: <input v-model="editedPerson.dob" type="date" /></p> <!-- Date of birth -->
                <p>Vai ir miris? <input type="checkbox" v-model="editedPerson.isDeceased"></p> <!-- Is deceased -->
                <p v-if="editedPerson.isDeceased">Miršanas datums: <input v-model="editedPerson.dod" type="date" /></p> <!-- Date of death -->
                <p v-if="editedPerson.parents[0] != null"><label for="parents">Izvēlieties otru vecāku:</label></p> <!-- Select second parent -->
                <p v-if="editedPerson.parents[0] != null">
                    <select name="parents" id="parents" v-model="editedPerson.primaryParents[0]">
                        <option :value="-1">Adoptēts</option>
                        <option v-for="parentID in getPerson(editedPerson.primaryParents[1]).spouses" :value="parentID" :selected="editedPerson.primaryParents[0] == parentID">
                            {{ getPerson(parentID).name }}
                        </option>
                    </select>
                </p>

                <!-- Articles -->
                <h4>Raksti:</h4>
                <div v-for="article, i in editedPerson.articles">
                    <p>Virsraksts: <input v-model="article.title" type="text" /></p>
                    <p><textarea class="desc" v-model="article.content"></textarea></p>
                    <button class="hover-up-p" style="margin: 3pt 0;" @click="removeArticle(editedPerson, i)">
                        <p>Noņemt rakstu</p>
                        <div class="bg red op-30"></div>
                    </button>
                </div>
                
                <!-- Add article -->
                <button class="hover-up-p" style="margin: 4pt 0;" @click="addArticle(editedPerson)">
                    <p>Pievienot rakstu</p>
                    <div class="bg"></div>
                </button>

                <!-- Confirm -->
                <button class="hover-up-p" style="float: inline-end;" @click="confirmEdit()">
                    <p>Saglabāt</p>
                    <div class="bg op-40"></div>
                </button>
            </div>

            <!-- Exit -->
            <button class="exit-button hover-up-p pos-right-inline" @click="closePersonInfo()">
                <p>Aizvērt</p>
                <div class="bg accent"></div>
            </button>
        </div>

        <!-- Select person type -->
        <div class="select-person-type-container" v-bind:class="(currentNewPersonType == '' && adddingPerson)?'shown-0--50':''">
            <h4 style="text-align: center;">Select person type</h4>

            <button class="select-new-person-button hover-up-p z-1" @click="addPersonFromType('child')">
                <p>Bērns</p>
                <div class="bg op-70 secondary"></div>
            </button>

            <button class="select-new-person-button hover-up-p z-1" @click="addPersonFromType('spouse')">
                <p>Dzīvesbiedrs</p>
                <div class="bg op-70 secondary"></div>
            </button>

            <button class="select-new-person-button hover-up-p z-1" @click="addPersonFromType('parent')">
                <p>Vecāks</p>
                <div class="bg op-70 secondary"></div>
            </button>

            <button class="exit-button hover-up-p z-1" @click="closePersonInfo()">
                <p>Aizvērt</p>
                <div class="bg op-80 secondary"></div>
            </button>

            <div class="bg op-40"></div>
        </div>

        <!-- Add person from type -->
        <div class="edit-person-info-container" v-bind:class="(currentNewPersonType != '')?'shown':''">
            <h2 v-if="currentNewPersonType == 'child'">Pievienot bērnu</h2>
            <h2 v-if="currentNewPersonType == 'spouse'">Pievienot dzīvesbiedru</h2>
            <h2 v-if="currentNewPersonType == 'parent'">Pievienot vecāku</h2>
            <!-- Add form -->
            <div class="add-person-form">
                <p>Vārds: <input v-model="newPerson.name" type="text" /></p> <!-- Name -->
                <p>Dzimšanas datums: <input v-model="newPerson.dob" type="date" /></p> <!-- Date of birth -->
                <p>Vai ir miris? <input type="checkbox" v-model="newPerson.isDeceased"></p> <!-- Is deceased -->
                <p v-if="newPerson.isDeceased">Miršanas datums: <input v-model="newPerson.dod" type="date" /></p> <!-- Date of death -->
                <p v-if="currentNewPersonType == 'child'"><label for="parents">Izvēlieties otru vecāku:</label></p> <!-- Select second parent -->
                <p v-if="currentPID && currentNewPersonType == 'child'">
                    <select name="parents" id="parents" v-model="newPerson.primaryParents[0]">
                        <option :value="-1" :selected="true">Adoptēts</option>
                        <option v-for="parentID in getPerson(currentPID).spouses" :value="parentID">
                            {{ getPerson(parentID).name }}
                        </option>
                    </select>
                </p>

                <!-- Articles -->
                <h3>Raksti:</h3>
                <div v-for="article, i in newPerson.articles">
                    <p>Virsraksts: <input v-model="article.title" type="text" /></p>
                    <p><textarea class="desc" v-model="article.content"></textarea></p>
                    <button class="hover-up-p" style="margin: 3pt 0;" @click="removeArticle(newPerson, i)">
                        <p>Noņemt rakstu</p>
                        <div class="bg red op-30"></div>
                    </button>
                </div>

                <!-- Add article -->
                <button class="hover-up-p" style="margin: 4pt 0;" @click="addArticle(newPerson)">
                    <p>Pievienot rakstu</p>
                    <div class="bg"></div>
                </button>

                <button class="hover-up-p" style="float: inline-end;" @click="(currentNewPersonType == 'child')?addChild():((currentNewPersonType == 'parent')?addParent():addSpouse())">
                    <p>PIEVIENOT</p>
                    <div class="bg op-40"></div>
                </button>
            </div>

            <!-- Exit -->
            <button class="exit-button hover-up-p pos-right-inline" @click="closePersonInfo()">
                <p>Aizvērt</p>
                <div class="bg accent"></div>
            </button>
        </div>

        <!-- UPDATE TREE -->
        <button class="exit-button hover-up-p" v-if="tree.people.length != 0" @click="updateTree()">
            <p>Saglabāt koku</p>
            <div class="bg accent"></div>
        </button>

        <!-- Confirm person removal -->
        <div class="confirm-person-remove" v-bind:class="(removePID)?'shown-0-0':''">
            <h2>Vai jūs esat drošs?</h2>
            <button v-if="removePID" class="hover-up-p" @click="closePersonInfo()">
                <p>Nē</p>
                <div class="bg secondary op-80 z--3"></div>
            </button>
            <button v-if="removePID" class="hover-up-p" @click="removePerson(removePID)">
                <p>Jā</p>
                <div class="bg red op-80 z--3"></div>
            </button>
            <button v-if="removePID" class="hover-up-p" @click="closePersonInfo()">
                <p>Nē</p>
                <div class="bg secondary op-80 z--3"></div>
            </button>
            <div class="bg op-30 z--5"></div>
        </div>

        <!-- Error mesasge -->
        <div class="error-message z-10" :style="(errorMsg.length > 0)?'':'transform: translateX(-50%) translateY(calc(100% + 20pt))'">
            <p>{{ errorMsg }}</p>
            <div class="bg red op-40"></div>
        </div>
       
        <!--  IF NO PERSON EXISTS -->
        <!-- Add new person form -->
        <div class="add-person-container" v-if="tree.people.length == 0">
            <h2>Pievienot personu</h2>
            <p>Vārds: <input type="text" v-model="newPerson.name"></p>
            <p>Dzimšanas datums: <input type="date" v-model="newPerson.dob"></p>
            <p>Vai ir miris? <input type="checkbox" v-model="newPerson.isDeceased"></p> <!-- Is deceased -->
            <p v-if="newPerson.isDeceased">Miršanas datums: <input type="date" v-model="newPerson.dod"></p>
            <button class="hover-up-p" @click="addPerson(newPerson)">
                <p>Izveidot personu</p>
            </button>

            <div class="bg"></div>
        </div>
    </div>
</template>

<style scoped lang="scss">
    @import "../assets/css/tree.scss";
    @import "../assets/css/base.scss";
    @import "../assets/css/colors.scss";
</style>