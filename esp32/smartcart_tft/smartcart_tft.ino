/*
 * SmartCart — display do total no ESP32 + TFT GC9A01 (MQTT)
 *
 * Fluxo:
 *   Site (celular) publica o total → broker HiveMQ → este ESP32 desenha no TFT
 *
 * Bibliotecas (Arduino Library Manager):
 *   - PubSubClient (Nick O'Leary)
 *   - Adafruit GFX Library
 *   - Adafruit GC9A01A
 *
 * Placa: ESP32 Dev Module
 * Display: GC9A01 redondo 1.28" (240x240) SPI
 *
 * Ligações típicas:
 *   TFT VCC  -> 3.3V
 *   TFT GND  -> GND
 *   TFT CS   -> GPIO 5
 *   TFT DC   -> GPIO 16   (às vezes chamado RS)
 *   TFT RST  -> GPIO 17
 *   TFT MOSI -> GPIO 23   (SDA / DIN)
 *   TFT SCK  -> GPIO 18   (SCL / CLK)
 *   TFT BL   -> GPIO 4    (backlight; ou 3.3V fixo)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>
#include <SPI.h>
#include <cstring>
#include <math.h>

// ========== AJUSTE AQUI ==========
const char* WIFI_SSID       = "SUA_REDE_WIFI";
const char* WIFI_SENHA      = "SUA_SENHA_WIFI";
const char* CODIGO_CARRINHO = "demo"; // MESMO código do site

const char* MQTT_HOST = "broker.hivemq.com";
const uint16_t MQTT_PORT = 1883;
// =================================

#define TFT_CS   5
#define TFT_DC   16
#define TFT_RST  17
#define TFT_BL   4

#define TELA_W 240
#define TELA_H 240

// Cores extras (nem todas vêm definidas na GC9A01A)
#define COR_FUNDO     0x0000
#define COR_BRANCO    0xFFFF
#define COR_AMARELO   0xFFE0
#define COR_CIANO     0x07FF
#define COR_VERMELHO  0xF800
#define COR_VERDE     0xAFE5
#define COR_CINZA     0x8410
#define COR_CINZA_ESC 0x4208

Adafruit_GC9A01A tft(TFT_CS, TFT_DC, TFT_RST);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

float totalAtual = 0.0f;
int   itensAtual = 0;
bool  mqttOk = false;
bool  wifiOk = false;

char topicoTotal[80];
char topicoItens[80];

unsigned long ultimoWifiMs = 0;
unsigned long ultimoMqttMs = 0;

void formatarReais(float valor, char* saida, size_t tam) {
  if (valor < 0) valor = 0;
  long centavosTotais = (long)(valor * 100.0f + 0.5f);
  long reais = centavosTotais / 100;
  int centavos = (int)(centavosTotais % 100);
  snprintf(saida, tam, "R$ %ld,%02d", reais, centavos);
}

int larguraTexto(const char* texto, uint8_t tamanho) {
  return (int)strlen(texto) * 6 * (int)tamanho;
}

void textoCentralizado(const char* texto, int y, uint8_t tamanho, uint16_t cor) {
  tft.setTextSize(tamanho);
  tft.setTextColor(cor);
  int x = (TELA_W - larguraTexto(texto, tamanho)) / 2;
  if (x < 8) x = 8;
  tft.setCursor(x, y);
  tft.print(texto);
}

void desenharTela() {
  tft.fillScreen(COR_FUNDO);

  // Anel para enquadrar no display redondo
  tft.drawCircle(TELA_W / 2, TELA_H / 2, 118, COR_CINZA_ESC);

  textoCentralizado("SmartCart", 42, 2, COR_VERDE);

  if (!wifiOk) {
    textoCentralizado("WiFi offline", 68, 1, COR_VERMELHO);
  } else if (!mqttOk) {
    textoCentralizado("MQTT...", 68, 1, COR_AMARELO);
  } else {
    textoCentralizado("MQTT online", 68, 1, COR_CIANO);
  }

  textoCentralizado("TOTAL", 92, 1, COR_BRANCO);

  char texto[28];
  formatarReais(totalAtual, texto, sizeof(texto));
  // size 3 cabe melhor no círculo 240px
  textoCentralizado(texto, 112, 3, COR_AMARELO);

  char linhaItens[32];
  if (itensAtual <= 0 && totalAtual <= 0.001f) {
    snprintf(linhaItens, sizeof(linhaItens), "Aguardando...");
  } else if (itensAtual == 1) {
    snprintf(linhaItens, sizeof(linhaItens), "1 item");
  } else {
    snprintf(linhaItens, sizeof(linhaItens), "%d itens", itensAtual);
  }
  textoCentralizado(linhaItens, 160, 2, COR_CINZA);

  char linhaCodigo[40];
  snprintf(linhaCodigo, sizeof(linhaCodigo), "id: %s", CODIGO_CARRINHO);
  textoCentralizado(linhaCodigo, 190, 1, COR_CINZA_ESC);
}

void aoReceberMqtt(char* topic, byte* payload, unsigned int length) {
  char msg[64];
  if (length >= sizeof(msg)) length = sizeof(msg) - 1;
  memcpy(msg, payload, length);
  msg[length] = '\0';

  bool mudou = false;

  if (strcmp(topic, topicoTotal) == 0) {
    float novo = atof(msg);
    if (novo < 0) novo = 0;
    if (fabsf(novo - totalAtual) > 0.001f) {
      totalAtual = novo;
      mudou = true;
    }
  } else if (strcmp(topic, topicoItens) == 0) {
    int novo = atoi(msg);
    if (novo < 0) novo = 0;
    if (novo != itensAtual) {
      itensAtual = novo;
      mudou = true;
    }
  }

  if (mudou) {
    Serial.print("Update total=");
    Serial.print(totalAtual);
    Serial.print(" itens=");
    Serial.println(itensAtual);
    desenharTela();
  }
}

bool tentarWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiOk) {
      wifiOk = true;
      desenharTela();
    }
    return true;
  }

  wifiOk = false;
  mqttOk = false;

  Serial.println("Conectando WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 12000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  wifiOk = (WiFi.status() == WL_CONNECTED);
  if (wifiOk) {
    Serial.print("WiFi OK: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Falha WiFi");
  }
  desenharTela();
  return wifiOk;
}

bool tentarMqtt() {
  if (!wifiOk) return false;
  if (mqtt.connected()) {
    mqttOk = true;
    return true;
  }

  mqttOk = false;
  String clientId = "smartcart-tft-";
  clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

  Serial.print("MQTT...");
  if (mqtt.connect(clientId.c_str())) {
    Serial.println(" ok");
    mqtt.subscribe(topicoTotal);
    mqtt.subscribe(topicoItens);
    mqttOk = true;
    desenharTela();
    return true;
  }

  Serial.print(" falhou rc=");
  Serial.println(mqtt.state());
  mqttOk = false;
  desenharTela();
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  snprintf(topicoTotal, sizeof(topicoTotal), "smartcart/%s/total", CODIGO_CARRINHO);
  snprintf(topicoItens, sizeof(topicoItens), "smartcart/%s/itens", CODIGO_CARRINHO);

  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  tft.begin();
  tft.setRotation(0); // GC9A01 240x240
  desenharTela();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(aoReceberMqtt);
  mqtt.setBufferSize(256);
  mqtt.setKeepAlive(30);

  tentarWifi();
  if (wifiOk) tentarMqtt();
}

void loop() {
  unsigned long agora = millis();

  if (WiFi.status() != WL_CONNECTED) {
    wifiOk = false;
    mqttOk = false;
    if (agora - ultimoWifiMs > 8000) {
      ultimoWifiMs = agora;
      tentarWifi();
    }
  } else {
    wifiOk = true;
    if (!mqtt.connected()) {
      mqttOk = false;
      if (agora - ultimoMqttMs > 4000) {
        ultimoMqttMs = agora;
        tentarMqtt();
      }
    } else {
      mqttOk = true;
      mqtt.loop();
    }
  }
}
