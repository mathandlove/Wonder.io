import { createStore } from 'vuex';

export default createStore({
  state: {
    GradeFilter: 'NONE',
    GradeBookOrder: {
      PRE: [1, 2, 3, 4, 5],
      K: [1, 4, 2, 5, 3],
      1: [2, 3, 4, 5, 1],
      2: [2, 1, 5, 4, 3],
      3: [3, 5, 4, 2, 1],
      4: [3, 2, 1, 4, 5],
      5: [4, 5, 1, 2, 3],
      6: [4, 3, 1, 5, 4],
      NONE: [5, 4, 3, 2, 1],
    },
    BookNameArray: [
      'The Case of the Bedroom Egg',
      'Danger in the Woods',
      'The Case of the Wrong Bus',
      'The Case of the Missing Moon',
      'The Case of the Haunted House',
    ],
  },
  mutations: {
    SET_GRADE_FILTER(state, event) {
      state.GradeFilter = event;
    },
  },
  actions: {
    setGradeFilter({ commit }, filterValue) {
      commit('SET_GRADE_FILTER', filterValue);
    },
  },
  modules: {
  },
});
