/*
 * SmartCart — motores DC 24V (BTS7960)
 *
 * Controles:
 *   1) Joystick local (analógico)
 *   2) Site via MQTT  → tópico smartcart/<CODIGO>/cmd
 *      valores: frente | tras | esquerda | direita | parar
 *
 * Se chegar comando MQTT recente, ele tem prioridade sobre o joystick.
 * Se o site parar de mandar comando por ~450ms, o carrinho para (segurança).
 *
 * Bibliotecas: PubSubClient
 *
 * Ligações BTS7960: ver comentários abaixo (GND comum; 24V só nos drivers).
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <cstring>

// ========== AJUSTE AQUI ==========
const char* WIFI_SSID       = "netnormar";
const char* WIFI_SENHA      = "pobreimundo";
const char* CODIGO_CARRINHO = "demo"; // igual ao site

const char* MQTT_HOST = "broker.hivemq.com";
const uint16_t MQTT_PORT = 1883;

const int VELOCIDADE_REMOTA = 200; // 0..255 ao controlar pelo site
const unsigned long TIMEOUT_CMD_MS = 900; // margem enquanto o site reenvia
// =================================

// Joystick
const int PIN_JOY_X = 34;
const int PIN_JOY_Y = 35;
const int JOY_CENTRO = 2048;
const int JOY_MAX = 2047;
const int DEADZONE = 250;

// BTS7960 — Motor A (esquerdo)
const int MOTOR_A_RPWM = 26;
const int MOTOR_A_LPWM = 27;
const int MOTOR_A_REN  = 14;
const int MOTOR_A_LEN  = 12;

// BTS7960 — Motor B (direito)
const int MOTOR_B_RPWM = 25;
const int MOTOR_B_LPWM = 33;
const int MOTOR_B_REN  = 13;
const int MOTOR_B_LEN  = 15;

const int PWM_FREQ = 5000;
const int PWM_RES  = 8;
const int PWM_MAX  = 255;
const int PAUSA_INVERSAO_MS = 120;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topicoCmd[80];
char comandoRemoto[16] = "parar";
unsigned long ultimoCmdMs = 0;

int sentidoA = 0;
int sentidoB = 0;
unsigned long ultimoWifiMs = 0;
unsigned long ultimoMqttMs = 0;

void moverBTS7960(int rpwm, int lpwm, int velocidade);
void pararCanal(int rpwm, int lpwm);
void pararTudo();
void acionarMotorSeguro(int rpwm, int lpwm, int velocidade, int* sentidoAtual, char motorId);
int sinal(int v);

void aplicarDirecao(int velA, int velB) {
  acionarMotorSeguro(MOTOR_A_RPWM, MOTOR_A_LPWM, velA, &sentidoA, 'A');
  acionarMotorSeguro(MOTOR_B_RPWM, MOTOR_B_LPWM, velB, &sentidoB, 'B');
}

void comandoParaMotores(const char* cmd, int* velA, int* velB) {
  const int v = VELOCIDADE_REMOTA;
  *velA = 0;
  *velB = 0;

  if (strcmp(cmd, "frente") == 0) {
    *velA = v;
    *velB = v;
  } else if (strcmp(cmd, "tras") == 0) {
    *velA = -v;
    *velB = -v;
  } else if (strcmp(cmd, "esquerda") == 0) {
    // A frente, B ré  → gira esquerda
    *velA = v;
    *velB = -v;
  } else if (strcmp(cmd, "direita") == 0) {
    *velA = -v;
    *velB = v;
  } else {
    // parar / desconhecido
    *velA = 0;
    *velB = 0;
  }
}

void aoReceberMqtt(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, topicoCmd) != 0) return;

  char msg[16];
  if (length >= sizeof(msg)) length = sizeof(msg) - 1;
  memcpy(msg, payload, length);
  msg[length] = '\0';

  for (unsigned int i = 0; i < length; i++) {
    if (msg[i] >= 'A' && msg[i] <= 'Z') msg[i] = msg[i] - 'A' + 'a';
  }

  // Evita spam de "parar" logo após um comando de movimento (ruído de UI)
  if (strcmp(msg, "parar") == 0 &&
      strcmp(comandoRemoto, "parar") != 0 &&
      (millis() - ultimoCmdMs) < 80) {
    return;
  }

  strncpy(comandoRemoto, msg, sizeof(comandoRemoto) - 1);
  comandoRemoto[sizeof(comandoRemoto) - 1] = '\0';
  ultimoCmdMs = millis();

  // Aplica na hora (não espera o próximo loop)
  int velA = 0;
  int velB = 0;
  comandoParaMotores(comandoRemoto, &velA, &velB);
  aplicarDirecao(velA, velB);

  Serial.print("CMD: ");
  Serial.print(comandoRemoto);
  Serial.print(" A=");
  Serial.print(velA);
  Serial.print(" B=");
  Serial.println(velB);
}

bool tentarWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.println("WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 12000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(WiFi.localIP());
    return true;
  }
  return false;
}

bool tentarMqtt() {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (mqtt.connected()) return true;

  String clientId = "smartcart-motors-";
  clientId += String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.print("MQTT...");
  if (mqtt.connect(clientId.c_str())) {
    Serial.println(" ok");
    mqtt.subscribe(topicoCmd);
    Serial.println(topicoCmd);
    return true;
  }
  Serial.print(" falhou rc=");
  Serial.println(mqtt.state());
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  snprintf(topicoCmd, sizeof(topicoCmd), "smartcart/%s/cmd", CODIGO_CARRINHO);

  pinMode(MOTOR_A_REN, OUTPUT);
  pinMode(MOTOR_A_LEN, OUTPUT);
  pinMode(MOTOR_B_REN, OUTPUT);
  pinMode(MOTOR_B_LEN, OUTPUT);
  digitalWrite(MOTOR_A_REN, HIGH);
  digitalWrite(MOTOR_A_LEN, HIGH);
  digitalWrite(MOTOR_B_REN, HIGH);
  digitalWrite(MOTOR_B_LEN, HIGH);

  ledcAttach(MOTOR_A_RPWM, PWM_FREQ, PWM_RES);
  ledcAttach(MOTOR_A_LPWM, PWM_FREQ, PWM_RES);
  ledcAttach(MOTOR_B_RPWM, PWM_FREQ, PWM_RES);
  ledcAttach(MOTOR_B_LPWM, PWM_FREQ, PWM_RES);

  pararTudo();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(aoReceberMqtt);
  mqtt.setBufferSize(256);
  mqtt.setKeepAlive(30);

  tentarWifi();
  if (WiFi.status() == WL_CONNECTED) tentarMqtt();

  Serial.println("SmartCart motores: joystick + MQTT");
}

void loop() {
  unsigned long agora = millis();

  if (WiFi.status() != WL_CONNECTED) {
    if (agora - ultimoWifiMs > 8000) {
      ultimoWifiMs = agora;
      tentarWifi();
    }
  } else if (!mqtt.connected()) {
    if (agora - ultimoMqttMs > 4000) {
      ultimoMqttMs = agora;
      tentarMqtt();
    }
  } else {
    mqtt.loop();
  }

  int velA = 0;
  int velB = 0;
  bool usandoRemoto = false;

  // Comando do site tem prioridade se for recente
  if (agora - ultimoCmdMs < TIMEOUT_CMD_MS) {
    usandoRemoto = true;
    comandoParaMotores(comandoRemoto, &velA, &velB);
  } else {
    // Timeout de segurança: se o site soltou o botão e não mandou "parar"
    if (strcmp(comandoRemoto, "parar") != 0) {
      strncpy(comandoRemoto, "parar", sizeof(comandoRemoto) - 1);
    }

    // Joystick local
    int leituraX = analogRead(PIN_JOY_X);
    int leituraY = analogRead(PIN_JOY_Y);
    int eixoX = leituraX - JOY_CENTRO;
    int eixoY = leituraY - JOY_CENTRO;
    if (abs(eixoX) < DEADZONE) eixoX = 0;
    if (abs(eixoY) < DEADZONE) eixoY = 0;

    int frenteTras = map(eixoY, -JOY_MAX, JOY_MAX, -PWM_MAX, PWM_MAX);
    int curva      = map(eixoX, -JOY_MAX, JOY_MAX, -PWM_MAX, PWM_MAX);
    frenteTras = constrain(frenteTras, -PWM_MAX, PWM_MAX);
    curva      = constrain(curva, -PWM_MAX, PWM_MAX);

    velA = constrain(frenteTras + curva, -PWM_MAX, PWM_MAX);
    velB = constrain(frenteTras - curva, -PWM_MAX, PWM_MAX);
  }

  aplicarDirecao(velA, velB);

  static unsigned long ultimoLog = 0;
  if (agora - ultimoLog > 400) {
    ultimoLog = agora;
    Serial.print(usandoRemoto ? "REMOTO " : "JOY ");
    Serial.print(comandoRemoto);
    Serial.print(" | A=");
    Serial.print(velA);
    Serial.print(" B=");
    Serial.println(velB);
  }

  delay(20);
}

void moverBTS7960(int rpwm, int lpwm, int velocidade) {
  int pwm = abs(velocidade);
  if (pwm > PWM_MAX) pwm = PWM_MAX;

  if (velocidade > 0) {
    ledcWrite(rpwm, pwm);
    ledcWrite(lpwm, 0);
  } else if (velocidade < 0) {
    ledcWrite(rpwm, 0);
    ledcWrite(lpwm, pwm);
  } else {
    ledcWrite(rpwm, 0);
    ledcWrite(lpwm, 0);
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

void acionarMotorSeguro(int rpwm, int lpwm, int velocidade, int* sentidoAtual, char motorId) {
  int novo = sinal(velocidade);
  // Sem delay aqui: delay dentro do callback MQTT/trava o controle remoto
  if (*sentidoAtual != 0 && novo != 0 && *sentidoAtual != novo) {
    pararCanal(rpwm, lpwm);
  }
  moverBTS7960(rpwm, lpwm, velocidade);
  *sentidoAtual = novo;
  (void)motorId;
  (void)PAUSA_INVERSAO_MS;
}
