// Pinos do Joystick
const int pinJoyX = 34; // HORZ no Wokwi
const int pinJoyY = 35; // VERT no Wokwi

// Pinos BTS7960 - Motor A (Esquerdo)
const int motorA_RPWM = 26; // LED 1 (Frente)
const int motorA_LPWM = 27; // LED 2 (Ré)

// Pinos BTS7960 - Motor B (Direito)
const int motorB_RPWM = 25; // LED 3 (Frente)
const int motorB_LPWM = 33; // LED 4 (Ré)

// Configurações do PWM
const int freq = 5000;
const int resolucao = 8; // 0 a 255

// Zona morta do joystick
const int deadzone = 250;

void setup() {
  Serial.begin(115200);

  // No BTS7960, os 4 pinos de controle recebem sinal PWM
  ledcAttach(motorA_RPWM, freq, resolucao);
  ledcAttach(motorA_LPWM, freq, resolucao);
  ledcAttach(motorB_RPWM, freq, resolucao);
  ledcAttach(motorB_LPWM, freq, resolucao);
}

void loop() {
  // Lê os valores do joystick (0 a 4095)
  int leituraX = analogRead(pinJoyX);
  int leituraY = analogRead(pinJoyY);

  // Centraliza em 0 (-2048 a +2047)
  int eixoX = leituraX - 2048;
  int eixoY = leituraY - 2048;

  // Aplica zona morta
  if (abs(eixoX) < deadzone) eixoX = 0;
  if (abs(eixoY) < deadzone) eixoY = 0;

  // Mistura os eixos para controle de carrinho
  int frenteTras = map(eixoY, -2048, 2047, -255, 255);
  int curva = map(eixoX, -2048, 2047, -255, 255);

  int velMotorA = constrain(frenteTras + curva, -255, 255);
  int velMotorB = constrain(frenteTras - curva, -255, 255);

  // Aciona os drivers BTS7960 (ou LEDs no Wokwi)
  moverBTS7960(motorA_RPWM, motorA_LPWM, velMotorA);
  moverBTS7960(motorB_RPWM, motorB_LPWM, velMotorB);

  delay(20);
}

// Função específica para o driver BTS7960
void moverBTS7960(int rpwm, int lpwm, int velocidade) {
  if (velocidade > 0) {
    // Gira para frente: PWM no RPWM, 0 no LPWM
    ledcWrite(rpwm, velocidade);
    ledcWrite(lpwm, 0);
  } else if (velocidade < 0) {
    // Gira para trás: 0 no RPWM, PWM no LPWM
    ledcWrite(rpwm, 0);
    ledcWrite(lpwm, abs(velocidade));
  } else {
    // Motor parado
    ledcWrite(rpwm, 0);
    ledcWrite(lpwm, 0);
  }
}
