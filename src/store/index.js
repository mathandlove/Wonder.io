import { createStore } from 'vuex';

export default createStore({
  state: {
    GradeFilter: '',
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
