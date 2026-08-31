export let currentSimulation: any = {
  id: '',
  target: '',
  scenario: '',
  generation: 0,
  transactions_count: 0,
  accounts_count: 0,
  merchants_count: 0,
  detection_rate: 0,
  status: 'idle',
  blind_spot_discovered: false,
};

export function setCurrentSimulation(sim: any) {
  currentSimulation = sim;
}

export function getCurrentSimulation() {
  return currentSimulation;
}

export default {
  getCurrentSimulation,
  setCurrentSimulation,
};
