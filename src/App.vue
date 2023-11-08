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
      console.log(isLoggedIn.value);
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
    <router-link to="/" style="flex-basis: 2;">Home</router-link>
    <router-link to="/about">About</router-link>
    <router-link to="/people">People</router-link>
    <router-link v-if="gotAuth && isLoggedIn" to="/tree">Tree</router-link>
    <router-link v-if="gotAuth && !isLoggedIn" to="/sign-in">Sign in</router-link>
    <router-link v-if="gotAuth && !isLoggedIn" to="/register">Register</router-link>
    <button v-if="gotAuth && isLoggedIn" @click="handleSignOut">Sign Out</button>
  </nav>
  <div class="page-content">
    <router-view/>
  </div>
</template>

<style lang="scss">
  @import "./assets/css/base.scss";
  @import "./assets/css/colors.scss";
</style>
