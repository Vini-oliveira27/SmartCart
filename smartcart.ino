/*
 * SmartCart — controle de 2 motores DC 24V com joystick + BTS7960
 *
 * Une a lógica de direção (frente/ré) do teste no Tinkercad
 * com a leitura analógica do joystick e PWM diferencial.
 *
 * Hardware físico:
 *   - ESP32 (ou Arduino com adaptação de pinos/PWM)
 *   - Joystick analógico (eixos X e Y)
 *   - 2x driver BTS7960 (1 por motor)
 *   - 2x motor DC 24V  (alimentação dos motores NÃO passa pelo ESP32)
 *
 * Mapeamento Wokwi (LEDs = direção PWM):
 *   LED1 = Motor A RPWM (frente)
 *   LED2 = Motor A LPWM (ré)
 *   LED3 = Motor B RPWM (frente)
 *   LED4 = Motor B LPWM (ré)
 *
 *   Frente ........ LED1 + LED3
 *   Ré ............ LED2 + LED4
 *   Esquerda ...... LED1 + LED4  (A frente, B ré)
 *   Direita ....... LED2 + LED3  (A ré, B frente)
 *
 * Ligações típicas BTS7960 (cada módulo):
 *   RPWM, LPWM  -> pinos PWM abaixo
 *   R_EN, L_EN  -> 3.3V/5V (ou pinos EN abaixo, sempre HIGH)
 *   VCC (lógica)-> 5V / 3.3V conforme o módulo
 *   GND         -> GND comum com o ESP32
 *   B+ / B-     -> bateria/fonte 24V dos motores
 *   M+ / M-     -> motor DC
 */

// ========== JOYSTICK ==========
#if defined(ESP32)
  const int PIN_JOY_X = 34; // horizontal (curva)
  const int PIN_JOY_Y = 35; // vertical (frente/ré)
  const int JOY_CENTRO = 2048; // ADC 12 bits (0..4095)
  const int JOY_MAX = 2047;
#else
  // Arduino UNO / Mega (ADC 10 bits: 0..1023)
  const int PIN_JOY_X = A0;
  const int PIN_JOY_Y = A1;
  const int JOY_CENTRO = 512;
  const int JOY_MAX = 512;
#endif

const int DEADZONE = 250; // zona morta no centro (escala do ADC)

// ========== BTS7960 — MOTOR A (esquerdo) ==========
const int MOTOR_A_RPWM = 26; // frente  (LED1 no Wokwi)
const int MOTOR_A_LPWM = 27; // ré      (LED2 no Wokwi)
const int MOTOR_A_REN  = 14; // enable direita do half-bridge
const int MOTOR_A_LEN  = 12; // enable esquerda do half-bridge

// ========== BTS7960 — MOTOR B (direito) ==========
const int MOTOR_B_RPWM = 25; // frente  (LED3 no Wokwi)
const int MOTOR_B_LPWM = 33; // ré      (LED4 no Wokwi)
const int MOTOR_B_REN  = 13;
const int MOTOR_B_LEN  = 15;

// ========== PWM ==========
#if defined(ESP32)
  const int PWM_FREQ = 5000;
  const int PWM_RES  = 8; // 0..255
#endif
const int PWM_MAX = 255;

// Pausa ao inverter direção (protege motor/driver — ideia do teste com relé)
const int PAUSA_INVERSAO_MS = 120;

int sentidoA = 0; // -1 ré, 0 parado, 1 frente
int sentidoB = 0;

void setup() {
  Serial.begin(115200);

  pinMode(MOTOR_A_REN, OUTPUT);
  pinMode(MOTOR_A_LEN, OUTPUT);
  pinMode(MOTOR_B_REN, OUTPUT);
  pinMode(MOTOR_B_LEN, OUTPUT);

  // Enables sempre ligados (BTS7960 só responde com EN em HIGH)
  digitalWrite(MOTOR_A_REN, HIGH);
  digitalWrite(MOTOR_A_LEN, HIGH);
  digitalWrite(MOTOR_B_REN, HIGH);
  digitalWrite(MOTOR_B_LEN, HIGH);

#if defined(ESP32)
  ledcAttach(MOTOR_A_RPWM, PWM_FREQ, PWM_RES);
  ledcAttach(MOTOR_A_LPWM, PWM_FREQ, PWM_RES);
  ledcAttach(MOTOR_B_RPWM, PWM_FREQ, PWM_RES);
  ledcAttach(MOTOR_B_LPWM, PWM_FREQ, PWM_RES);
#else
  pinMode(MOTOR_A_RPWM, OUTPUT);
  pinMode(MOTOR_A_LPWM, OUTPUT);
  pinMode(MOTOR_B_RPWM, OUTPUT);
  pinMode(MOTOR_B_LPWM, OUTPUT);
#endif

  pararTudo();
  Serial.println("SmartCart pronto — joystick + 2x BTS7960");
}

void loop() {
  int leituraX = analogRead(PIN_JOY_X);
  int leituraY = analogRead(PIN_JOY_Y);

  // Centraliza em 0
  int eixoX = leituraX - JOY_CENTRO;
  int eixoY = leituraY - JOY_CENTRO;

  if (abs(eixoX) < DEADZONE) eixoX = 0;
  if (abs(eixoY) < DEADZONE) eixoY = 0;

  // Y: frente/ré | X: curva (diferencial)
  // Se no físico frente/ré estiver invertido, troque o sinal de frenteTras.
  int frenteTras = map(eixoY, -JOY_MAX, JOY_MAX, -PWM_MAX, PWM_MAX);
  int curva      = map(eixoX, -JOY_MAX, JOY_MAX, -PWM_MAX, PWM_MAX);

  frenteTras = constrain(frenteTras, -PWM_MAX, PWM_MAX);
  curva      = constrain(curva, -PWM_MAX, PWM_MAX);

  // Mistura diferencial (igual ao conceito LED 1+3 / 2+4 / 1+4 / 2+3)
  int velA = constrain(frenteTras + curva, -PWM_MAX, PWM_MAX);
  int velB = constrain(frenteTras - curva, -PWM_MAX, PWM_MAX);

  acionarMotorSeguro(MOTOR_A_RPWM, MOTOR_A_LPWM, velA, &sentidoA, 'A');
  acionarMotorSeguro(MOTOR_B_RPWM, MOTOR_B_LPWM, velB, &sentidoB, 'B');

  static unsigned long ultimoLog = 0;
  if (millis() - ultimoLog > 300) {
    ultimoLog = millis();
    Serial.print("Joy X=");
    Serial.print(leituraX);
    Serial.print(" Y=");
    Serial.print(leituraY);
    Serial.print(" | A=");
    Serial.print(velA);
    Serial.print(" B=");
    Serial.println(velB);
  }

  delay(20);
}

/*
 * Mesma regra do teste com relés:
 *   RPWM HIGH / LPWM LOW  -> um sentido (frente)
 *   RPWM LOW  / LPWM HIGH -> sentido inverso (ré)
 *   ambos LOW             -> parado
 * Só que aqui o "HIGH" vira PWM (0..255) para controlar a velocidade.
 */
void moverBTS7960(int rpwm, int lpwm, int velocidade) {
  int pwm = abs(velocidade);
  if (pwm > PWM_MAX) pwm = PWM_MAX;

  if (velocidade > 0) {
#if defined(ESP32)
    ledcWrite(rpwm, pwm);
    ledcWrite(lpwm, 0);
#else
    analogWrite(rpwm, pwm);
    analogWrite(lpwm, 0);
#endif
  } else if (velocidade < 0) {
#if defined(ESP32)
    ledcWrite(rpwm, 0);
    ledcWrite(lpwm, pwm);
#else
    analogWrite(rpwm, 0);
    analogWrite(lpwm, pwm);
#endif
  } else {
#if defined(ESP32)
    ledcWrite(rpwm, 0);
    ledcWrite(lpwm, 0);
#else
    analogWrite(rpwm, 0);
    analogWrite(lpwm, 0);
#endif
  }
}

void pararCanal(int rpwm, int lpwm) {
  moverBTS7960(rpwm, lpwm, 0);
}

void pararTudo() {
  pararCanal(MOTOR_A_RPWM, MOTOR_A_LPWM);
  pararCanal(MOTOR_B_RPWM, MOTOR_B_LPWM);
  sentidoA = 0;
  sentidoB = 0;
}

int sinal(int v) {
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}

// Para antes de inverter (como no código dos relés)
void acionarMotorSeguro(int rpwm, int lpwm, int velocidade, int* sentidoAtual, char motorId) {
  int novo = sinal(velocidade);

  if (*sentidoAtual != 0 && novo != 0 && *sentidoAtual != novo) {
    pararCanal(rpwm, lpwm);
    delay(PAUSA_INVERSAO_MS);
    Serial.print("Motor ");
    Serial.print(motorId);
    Serial.println(": pausa de inversao");
  }

  moverBTS7960(rpwm, lpwm, velocidade);
  *sentidoAtual = novo;
}
