/*
 * SmartCart — motores DC 24V (BTS7960)
 *
 * Controles:
 *   1) Site via MQTT  → smartcart/<CODIGO>/cmd
 *      frente | tras | esquerda | direita | parar
 *   2) Joystick local (opcional — desligado por padrão)
 *
 * Comando remoto fica "travado" até receber "parar"
 * (assim o motor gira contínuo, sem pulsar).
 *
 * Biblioteca: PubSubClient
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <cstring>

// ========== AJUSTE AQUI ==========
const char* WIFI_SSID       = "SUA_REDE_WIFI";
const char* WIFI_SENHA      = "SUA_SENHA_WIFI";
const char* CODIGO_CARRINHO = "demo";

const char* MQTT_HOST = "broker.hivemq.com";
const uint16_t MQTT_PORT = 1883;

const int VELOCIDADE_REMOTA = 220; // 0..255
const unsigned long TIMEOUT_SEGURANCA_MS = 5000; // para se o site sumir

// true só se o joystick estiver fisicamente ligado ao ESP32
const bool USAR_JOYSTICK = false;
// =================================

const int PIN_JOY_X = 34;
const int PIN_JOY_Y = 35;
const int JOY_CENTRO = 2048;
const int JOY_MAX = 2047;
const int DEADZONE = 250;

const int MOTOR_A_RPWM = 26;
const int MOTOR_A_LPWM = 27;
const int MOTOR_A_REN  = 14;
const int MOTOR_A_LEN  = 12;

const int MOTOR_B_RPWM = 25;
const int MOTOR_B_LPWM = 33;
const int MOTOR_B_REN  = 13;
const int MOTOR_B_LEN  = 15;

const int PWM_FREQ = 20000; // 20 kHz — menos “zumbido”, giro mais limpo
const int PWM_RES  = 8;
const int PWM_MAX  = 255;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topicoCmd[80];
char comandoRemoto[16] = "parar";
bool remotoAtivo = false;
unsigned long ultimoCmdMs = 0;

int sentidoA = 0;
int sentidoB = 0;
unsigned long ultimoWifiMs = 0;
unsigned long ultimoMqttMs = 0;

void moverBTS7960(int rpwm, int lpwm, int velocidade);
void pararCanal(int rpwm, int lpwm);
void pararTudo();
void aplicarDirecao(int velA, int velB);
void comandoParaMotores(const char* cmd, int* velA, int* velB);

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

void aplicarDirecao(int velA, int velB) {
  // Motor A
  if (velA > 0) {
    sentidoA = 1;
    moverBTS7960(MOTOR_A_RPWM, MOTOR_A_LPWM, velA);
  } else if (velA < 0) {
    sentidoA = -1;
    moverBTS7960(MOTOR_A_RPWM, MOTOR_A_LPWM, velA);
  } else {
    sentidoA = 0;
    pararCanal(MOTOR_A_RPWM, MOTOR_A_LPWM);
  }

  // Motor B
  if (velB > 0) {
    sentidoB = 1;
    moverBTS7960(MOTOR_B_RPWM, MOTOR_B_LPWM, velB);
  } else if (velB < 0) {
    sentidoB = -1;
    moverBTS7960(MOTOR_B_RPWM, MOTOR_B_LPWM, velB);
  } else {
    sentidoB = 0;
    pararCanal(MOTOR_B_RPWM, MOTOR_B_LPWM);
  }
}

void comandoParaMotores(const char* cmd, int* velA, int* velB) {
  const int v = VELOCIDADE_REMOTA;
  *velA = 0;
  *velB = 0;

  if (strcmp(cmd, "frente") == 0) {
    *velA = v; *velB = v;
  } else if (strcmp(cmd, "tras") == 0) {
    *velA = -v; *velB = -v;
  } else if (strcmp(cmd, "esquerda") == 0) {
    *velA = v; *velB = -v;
  } else if (strcmp(cmd, "direita") == 0) {
    *velA = -v; *velB = v;
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

  bool eMovimento =
    strcmp(msg, "frente") == 0 ||
    strcmp(msg, "tras") == 0 ||
    strcmp(msg, "esquerda") == 0 ||
    strcmp(msg, "direita") == 0;

  if (eMovimento) {
    strncpy(comandoRemoto, msg, sizeof(comandoRemoto) - 1);
    comandoRemoto[sizeof(comandoRemoto) - 1] = '\0';
    remotoAtivo = true;
    ultimoCmdMs = millis();

    int velA = 0, velB = 0;
    comandoParaMotores(comandoRemoto, &velA, &velB);
    aplicarDirecao(velA, velB);

    Serial.print("ANDAR ");
    Serial.print(comandoRemoto);
    Serial.print(" A=");
    Serial.print(velA);
    Serial.print(" B=");
    Serial.println(velB);
    return;
  }

  if (strcmp(msg, "parar") == 0) {
    remotoAtivo = false;
    strncpy(comandoRemoto, "parar", sizeof(comandoRemoto) - 1);
    ultimoCmdMs = millis();
    pararTudo();
    Serial.println("PARAR");
  }
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

  Serial.println("SmartCart motores prontos");
  Serial.println(USAR_JOYSTICK ? "Joystick: ON" : "Joystick: OFF (so MQTT)");
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

  // Segurança: se o site sumir com o motor ligado, para em alguns segundos
  if (remotoAtivo && (agora - ultimoCmdMs > TIMEOUT_SEGURANCA_MS)) {
    remotoAtivo = false;
    strncpy(comandoRemoto, "parar", sizeof(comandoRemoto) - 1);
    pararTudo();
    Serial.println("TIMEOUT seguranca -> PARAR");
  }

  if (remotoAtivo) {
    int velA = 0, velB = 0;
    comandoParaMotores(comandoRemoto, &velA, &velB);
    aplicarDirecao(velA, velB);
  } else if (USAR_JOYSTICK) {
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

    int velA = constrain(frenteTras + curva, -PWM_MAX, PWM_MAX);
    int velB = constrain(frenteTras - curva, -PWM_MAX, PWM_MAX);
    aplicarDirecao(velA, velB);
  } else {
    // Sem remoto e sem joystick: garante parado
    // (não chama pararTudo toda hora para não spammar)
  }

  delay(10);
}
