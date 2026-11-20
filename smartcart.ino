/*
 * SmartCart — motores DC 24V (BTS7960) + MQTT
 *
 * No site (modo clique):
 *   Frente / Ré / Esq / Dir  → motor LIGA e continua
 *   Parar                    → motor DESLIGA
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

const int VELOCIDADE_REMOTA = 255; // força máxima no teste
// =================================

const int MOTOR_A_RPWM = 26;
const int MOTOR_A_LPWM = 27;
const int MOTOR_A_REN  = 14;
const int MOTOR_A_LEN  = 12;

const int MOTOR_B_RPWM = 25;
const int MOTOR_B_LPWM = 33;
const int MOTOR_B_REN  = 13;
const int MOTOR_B_LEN  = 15;

// 1 kHz costuma funcionar melhor em módulos BTS7960 com optoacoplador
const int PWM_FREQ = 1000;
const int PWM_RES  = 8;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topicoCmd[80];
char comandoAtual[16] = "parar";
bool motorLigado = false;

unsigned long ultimoWifiMs = 0;
unsigned long ultimoMqttMs = 0;
unsigned long ultimoLogMs = 0;

void pwmWrite(int pino, int valor) {
  if (valor < 0) valor = 0;
  if (valor > 255) valor = 255;
  ledcWrite(pino, valor);
}

void motorA(int velocidade) {
  // velocidade: -255..255
  if (velocidade > 0) {
    pwmWrite(MOTOR_A_RPWM, velocidade);
    pwmWrite(MOTOR_A_LPWM, 0);
  } else if (velocidade < 0) {
    pwmWrite(MOTOR_A_RPWM, 0);
    pwmWrite(MOTOR_A_LPWM, -velocidade);
  } else {
    pwmWrite(MOTOR_A_RPWM, 0);
    pwmWrite(MOTOR_A_LPWM, 0);
  }
}

void motorB(int velocidade) {
  if (velocidade > 0) {
    pwmWrite(MOTOR_B_RPWM, velocidade);
    pwmWrite(MOTOR_B_LPWM, 0);
  } else if (velocidade < 0) {
    pwmWrite(MOTOR_B_RPWM, 0);
    pwmWrite(MOTOR_B_LPWM, -velocidade);
  } else {
    pwmWrite(MOTOR_B_RPWM, 0);
    pwmWrite(MOTOR_B_LPWM, 0);
  }
}

void pararMotores() {
  motorA(0);
  motorB(0);
  motorLigado = false;
  strncpy(comandoAtual, "parar", sizeof(comandoAtual) - 1);
}

void aplicarPwmDoComando(const char* cmd) {
  const int v = VELOCIDADE_REMOTA;

  if (strcmp(cmd, "frente") == 0) {
    motorA(v);
    motorB(v);
  } else if (strcmp(cmd, "tras") == 0) {
    motorA(-v);
    motorB(-v);
  } else if (strcmp(cmd, "esquerda") == 0) {
    motorA(v);
    motorB(-v);
  } else if (strcmp(cmd, "direita") == 0) {
    motorA(-v);
    motorB(v);
  } else {
    motorA(0);
    motorB(0);
  }
}

void aplicarComando(const char* cmd) {
  if (strcmp(cmd, "parar") == 0 ||
      !(strcmp(cmd, "frente") == 0 || strcmp(cmd, "tras") == 0 ||
        strcmp(cmd, "esquerda") == 0 || strcmp(cmd, "direita") == 0)) {
    pararMotores();
    Serial.println("PARAR");
    return;
  }

  strncpy(comandoAtual, cmd, sizeof(comandoAtual) - 1);
  comandoAtual[sizeof(comandoAtual) - 1] = '\0';
  motorLigado = true;
  aplicarPwmDoComando(comandoAtual);

  Serial.print("ANDAR ");
  Serial.print(comandoAtual);
  Serial.print(" v=");
  Serial.println(VELOCIDADE_REMOTA);
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

  // Mesmo comando de novo: ignora (não reaplica / não loga spam)
  if (strcmp(msg, comandoAtual) == 0) return;

  aplicarComando(msg);
}

bool tentarWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.println("WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 12000) {
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

  String id = "smartcart-motors-";
  id += String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.print("MQTT...");
  if (mqtt.connect(id.c_str())) {
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
  delay(300);

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

  pararMotores();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(aoReceberMqtt);
  mqtt.setBufferSize(256);
  mqtt.setKeepAlive(60);

  tentarWifi();
  if (WiFi.status() == WL_CONNECTED) tentarMqtt();

  Serial.println("Pronto. Clique Frente no site; Parar para frear.");
}

void loop() {
  unsigned long agora = millis();

  if (WiFi.status() != WL_CONNECTED) {
    if (agora - ultimoWifiMs > 8000) {
      ultimoWifiMs = agora;
      if (motorLigado) {
        pararMotores();
        Serial.println("WiFi caiu -> PARAR");
      }
      tentarWifi();
    }
  } else if (!mqtt.connected()) {
    if (agora - ultimoMqttMs > 4000) {
      ultimoMqttMs = agora;
      if (motorLigado) {
        pararMotores();
        Serial.println("MQTT caiu -> PARAR");
      }
      tentarMqtt();
    }
  } else {
    mqtt.loop();
  }

  // Reaplica PWM enquanto estiver andando (mantém o sinal firme)
  if (motorLigado) {
    aplicarPwmDoComando(comandoAtual);
  }

  if (agora - ultimoLogMs > 1000) {
    ultimoLogMs = agora;
    Serial.print(motorLigado ? "RUN " : "IDLE ");
    Serial.println(comandoAtual);
  }

  delay(10);
}
