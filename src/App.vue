<script setup>
  import { ref } from 'vue';
  import { getAuth, onAuthStateChanged, signOut} from "firebase/auth"
  import { useRouter } from 'vue-router';
  import { onMounted } from 'vue';

  const isLoggedIn = ref(false);
  const router = useRouter(); // Get refrence to router
  
  const gotAuth = ref(false);
  let auth;
  onMounted(() => {
    auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        isLoggedIn.value = true;
      } else {
        isLoggedIn.value = false;
      }
      // console.log("Is logged in? : " + isLoggedIn.value);
      gotAuth.value = true;
    });
  });
  
  const handleSignOut = () => {
    signOut(auth).then(() => {
      router.push("/");
    });
  };


</script>

<template>
  <nav>
    <router-link to="/" style="flex-basis: 2;">Sākums</router-link>
    <router-link to="/people">Cilvēki</router-link>
    <router-link v-if="gotAuth && isLoggedIn" to="/tree">Koki</router-link>
    <router-link v-if="gotAuth && !isLoggedIn" to="/sign-in">Ieiet</router-link>
    <router-link v-if="gotAuth && !isLoggedIn" to="/register">Reģistrētes</router-link>
    <button v-if="gotAuth && isLoggedIn" class="accent bold" @click="handleSignOut">Iziet</button>
  </nav>
  <div class="page-content">
    <router-view/>
  </div>

  <footer>
    <p>© 2023 Andris Seļāvo</p>
  </footer>
</template>

<style lang="scss">
  @import "./assets/css/base.scss";
  @import "./assets/css/colors.scss";
</style>
