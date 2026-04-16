<template>
  <the-background>
    <div class="topPadding">
      <img
        alt="Wonder Stories - Free Interactive Books for Kids"
        src="../assets/Images/WonderStories_Logo_BlackAlt.png"
        class="NavWonderLogo"
      />
      <router-link to="/parents" class="parentsLink">For Parents</router-link>
    </div>
    <div class="ChalkboardBasics ChalkboardWide">
      <div class="gradeGrid">
        <GradeSelector
          v-for="Grade in GradeArray"
          :key="Grade"
          :Grade="Grade"
        />
      </div>
    </div>
  </the-background>
</template>

<script>
import GradeSelector from "@/molecules/GradeSelector.vue";
import TheBackground from "@/components/ux/TheBackground.vue";
import { updateHomeMetaTags } from "@/utils/seo";

export default {
  components: {
    GradeSelector,
    TheBackground,
  },
  data() {
    const GradeArray = [
      "gradePreK",
      "gradeK",
      "grade1",
      "grade2",
      "grade3",
      "grade4",
      "grade5",
      "grade6",
    ];

    return {
      GradeArray,
    };
  },
  async mounted() {
    // Mark as returning visitor for future visits
    localStorage.setItem('wonder_visited', '1');
    updateHomeMetaTags();
    await this.getApiBooks();
  },
  methods: {
    getApiBooks: async function () {
      try {
        await this.$store.dispatch("setBookList");
        await this.$store.dispatch("fetchGradeFilters");
      } catch {}
    },
  },
};
</script>

<style scoped>
.topPadding {
  height: 20vh;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 5%;
}

.parentsLink {
  font-size: 0.85rem;
  color: #555;
  text-decoration: none;
  opacity: 0.75;
}
.parentsLink:hover {
  opacity: 1;
  color: #333;
}

.ChalkboardBasics {
  margin-left: 5vw;
  margin-right: 5vw;
  background-size: 100%;
  background-repeat: no-repeat;
  overflow: none;
}
.ChalkboardWide {
  height: 100%;
  padding-left: 8vw;
  padding-right: 8vw;
  padding-top: 8vh;
  background-image: url("../assets/Images/Chalkboard.png");
  background-repeat: no-repeat;
  background-size: 100% 110%;
}

.NavWonderLogo {
  width: 300px;
  object-fit: contain;
  margin-left: 5%;
}

.gradeGrid {
  display: grid;
  grid-template-columns: repeat(4, 25%);
  grid-template-rows: repeat(2, 45%);
  justify-items: center;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80vh;
  padding-bottom: 10vh;
}

@media (max-aspect-ratio: 857/847) {
  .gradeGrid {
    grid-template-columns: repeat(3, 33%);
    grid-template-rows: repeat(3, 33%);
  }
  .ChalkboardWide {
    background-image: url("../assets/Images/phoneBoard.png");
    padding-top: 5vh;
    height: 85vh;
  }
  .topPadding {
    height: 15vh;
  }
}

@media (max-aspect-ratio: 510/824) {
  .gradeGrid {
    grid-template-columns: repeat(2, 50%);
    grid-template-rows: repeat(4, 20%);
    padding-bottom: 0%;
  }
  .ChalkboardWide {
    background-image: url("../assets/Images/phoneBoard.png");
    height: 90vh;
    padding-left: 5vw;
    padding-right: 5vw;
  }
  .topPadding {
    height: 10vh;
  }

  .NavWonderLogo {
    height: 5vh;
    width: 40%;
  }
}
</style>
