let audioCtx;

export function bipe(frequencia, duracao = 0.12) {
  try {
    audioCtx =
      audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const ganho = audioCtx.createGain();
    osc.frequency.value = frequencia;
    ganho.gain.value = 0.08;
    osc.connect(ganho);
    ganho.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracao);
  } catch {
    /* sem áudio */
  }
}

export function feedbackSucesso() {
  bipe(880, 0.1);
  if (navigator.vibrate) navigator.vibrate(80);
}

export function feedbackErro() {
  bipe(220, 0.14);
  if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
}
