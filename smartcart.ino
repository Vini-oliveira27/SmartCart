/*
 * SmartCart — motores DC 24V (BTS7960) + MQTT
 *
 * Apertou Frente no site  → ANDAR (continua até Parar)
 * Soltou / Parar          → PARAR
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

const int VELOCIDADE_REMOTA = 220;
// Só para se NÃO receber nada por muito tempo (site fechou / WiFi caiu)
const unsigned long TIMEOUT_SEGURANCA_MS = 20000;
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

const int PWM_FREQ = 20000;
const int PWM_RES  = 8;
const int PWM_MAX  = 255;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topicoCmd[80];
char comandoRemoto[16] = "parar";
bool remotoAtivo = false;
unsigned long ultimoCmdMs = 0;

unsigned long ultimoWifiMs = 0;
unsigned long ultimoMqttMs = 0;
unsigned long ultimoLogMs = 0;

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

void pararTudo() {
  moverBTS7960(MOTOR_A_RPWM, MOTOR_A_LPWM, 0);
  moverBTS7960(MOTOR_B_RPWM, MOTOR_B_LPWM, 0);
}

void aplicarDirecao(int velA, int velB) {
  moverBTS7960(MOTOR_A_RPWM, MOTOR_A_LPWM, velA);
  moverBTS7960(MOTOR_B_RPWM, MOTOR_B_LPWM, velB);
}

void comandoParaMotores(const char* cmd, int* velA, int* velB) {
  const int v = VELOCIDADE_REMOTA;
  *velA = 0;
  *velB = 0;
  if (strcmp(cmd, "frente") == 0)      { *velA =  v; *velB =  v; }
  else if (strcmp(cmd, "tras") == 0)    { *velA = -v; *velB = -v; }
  else if (strcmp(cmd, "esquerda") == 0){ *velA =  v; *velB = -v; }
  else if (strcmp(cmd, "direita") == 0) { *velA = -v; *velB =  v; }
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
    strcmp(msg, "frente") == 0 || strcmp(msg, "tras") == 0 ||
    strcmp(msg, "esquerda") == 0 || strcmp(msg, "direita") == 0;

  if (eMovimento) {
    // Repetir o mesmo comando só renova o timeout — não “pulsa” o motor
    bool mesmo = remotoAtivo && strcmp(comandoRemoto, msg) == 0;
    strncpy(comandoRemoto, msg, sizeof(comandoRemoto) - 1);
    comandoRemoto[sizeof(comandoRemoto) - 1] = '\0';
    remotoAtivo = true;
    ultimoCmdMs = millis();

    int velA = 0, velB = 0;
    comandoParaMotores(comandoRemoto, &velA, &velB);
    aplicarDirecao(velA, velB);

    if (!mesmo) {
      Serial.print("ANDAR ");
      Serial.print(comandoRemoto);
      Serial.print(" A=");
      Serial.print(velA);
      Serial.print(" B=");
      Serial.println(velB);
    }
    return;
  }

  if (strcmp(msg, "parar") == 0) {
    // Ignora "parar" fantasma nos primeiros 120ms após começar a andar
    if (remotoAtivo && (millis() - ultimoCmdMs) < 120) {
      Serial.println("ignora parar cedo");
      return;
    }
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

  if (remotoAtivo) {
    // Mantém PWM contínuo
    int velA = 0, velB = 0;
    comandoParaMotores(comandoRemoto, &velA, &velB);
    aplicarDirecao(velA, velB);

    if (agora - ultimoCmdMs > TIMEOUT_SEGURANCA_MS) {
      remotoAtivo = false;
      strncpy(comandoRemoto, "parar", sizeof(comandoRemoto) - 1);
      pararTudo();
      Serial.println("TIMEOUT -> PARAR");
    }
  } else if (USAR_JOYSTICK) {
    int eixoX = analogRead(PIN_JOY_X) - JOY_CENTRO;
    int eixoY = analogRead(PIN_JOY_Y) - JOY_CENTRO;
    if (abs(eixoX) < DEADZONE) eixoX = 0;
    if (abs(eixoY) < DEADZONE) eixoY = 0;
    int frenteTras = constrain(map(eixoY, -JOY_MAX, JOY_MAX, -PWM_MAX, PWM_MAX), -PWM_MAX, PWM_MAX);
    int curva = constrain(map(eixoX, -JOY_MAX, JOY_MAX, -PWM_MAX, PWM_MAX), -PWM_MAX, PWM_MAX);
    aplicarDirecao(
      constrain(frenteTras + curva, -PWM_MAX, PWM_MAX),
      constrain(frenteTras - curva, -PWM_MAX, PWM_MAX)
    );
  }

  if (agora - ultimoLogMs > 1000) {
    ultimoLogMs = agora;
    Serial.print(remotoAtivo ? "RUN " : "IDLE ");
    Serial.println(comandoRemoto);
  }

  delay(5);
}
