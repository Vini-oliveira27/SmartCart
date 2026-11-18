let audioCtx;

export function bipe(frequencia) {
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
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    /* sem áudio */
  }
}

export function feedbackSucesso() {
  bipe(880);
  if (navigator.vibrate) navigator.vibrate(100);
}

export function feedbackErro() {
  bipe(220);
  if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
}
