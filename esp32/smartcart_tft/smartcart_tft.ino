/*
 * SmartCart — display do total no ESP32 + TFT
 *
 * O celular (site) publica o total via MQTT.
 * Este ESP32 assina o tópico e mostra só o valor no TFT.
 *
 * Bibliotecas (Arduino Library Manager):
 *   - PubSubClient (Nick O'Leary)
 *   - Adafruit GFX Library
 *   - Adafruit ILI9341
 *
 * Placa: ESP32 Dev Module
 * Display testado: TFT ILI9341 2.4" / 2.8" (320x240)
 *
 * Ligações típicas SPI (ajuste se o seu módulo for diferente):
 *   TFT VCC  -> 3.3V
 *   TFT GND  -> GND
 *   TFT CS   -> GPIO 5
 *   TFT DC   -> GPIO 16
 *   TFT RST  -> GPIO 17
 *   TFT MOSI -> GPIO 23
 *   TFT SCK  -> GPIO 18
 *   TFT MISO -> (não precisa)
 *   TFT BL   -> 3.3V (backlight)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <SPI.h>

// ========== AJUSTE AQUI ==========
const char* WIFI_SSID     = "SUA_REDE_WIFI";
const char* WIFI_SENHA    = "SUA_SENHA_WIFI";

// Mesmo código digitado no site (campo "Código do carrinho")
const char* CODIGO_CARRINHO = "demo";

const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883;
// =================================

#define TFT_CS   5
#define TFT_DC   16
#define TFT_RST  17

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

float totalAtual = 0.0f;
int   itensAtual = 0;
char  topicoTotal[64];
char  topicoItens[64];

void formatarReais(float valor, char* saida, size_t tam) {
  int reais = (int)valor;
  int centavos = (int)(valor * 100 + 0.5f) % 100;
  snprintf(saida, tam, "R$ %d,%02d", reais, centavos);
}

void desenharTela() {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextColor(ILI9341_GREENYELLOW);
  tft.setTextSize(2);
  tft.setCursor(20, 20);
  tft.print("SmartCart");

  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 70);
  tft.print("TOTAL DA COMPRA");

  char texto[24];
  formatarReais(totalAtual, texto, sizeof(texto));

  tft.setTextColor(ILI9341_YELLOW);
  tft.setTextSize(4);
  tft.setCursor(20, 120);
  tft.print(texto);

  tft.setTextColor(ILI9341_LIGHTGREY);
  tft.setTextSize(2);
  tft.setCursor(20, 190);
  if (itensAtual == 1) {
    tft.print("1 item");
  } else {
    tft.printf("%d itens", itensAtual);
  }
}

void aoReceberMqtt(char* topic, byte* payload, unsigned int length) {
  char msg[64];
  if (length >= sizeof(msg)) length = sizeof(msg) - 1;
  memcpy(msg, payload, length);
  msg[length] = '\0';

  if (strcmp(topic, topicoTotal) == 0) {
    totalAtual = atof(msg);
    if (totalAtual < 0) totalAtual = 0;
    desenharTela();
    Serial.printf("Total recebido: %.2f\n", totalAtual);
  } else if (strcmp(topic, topicoItens) == 0) {
    itensAtual = atoi(msg);
    if (itensAtual < 0) itensAtual = 0;
    desenharTela();
    Serial.printf("Itens recebidos: %d\n", itensAtual);
  }
}

void conectarWifi() {
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 20);
  tft.println("Conectando WiFi");
  tft.setCursor(10, 50);
  tft.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 40) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  tft.fillScreen(ILI9341_BLACK);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi OK: ");
    Serial.println(WiFi.localIP());
    tft.setTextColor(ILI9341_GREEN);
    tft.setTextSize(2);
    tft.setCursor(10, 20);
    tft.println("WiFi conectado");
    tft.setCursor(10, 50);
    tft.println(WiFi.localIP());
  } else {
    Serial.println("Falha no WiFi");
    tft.setTextColor(ILI9341_RED);
    tft.setTextSize(2);
    tft.setCursor(10, 20);
    tft.println("Falha no WiFi");
    tft.setCursor(10, 50);
    tft.println("Verifique SSID/senha");
  }
  delay(1500);
}

void conectarMqtt() {
  while (!mqtt.connected()) {
    Serial.print("MQTT...");
    String clientId = "smartcart-esp32-";
    clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

    if (mqtt.connect(clientId.c_str())) {
      Serial.println(" ok");
      mqtt.subscribe(topicoTotal);
      mqtt.subscribe(topicoItens);
      Serial.printf("Inscrito em %s e %s\n", topicoTotal, topicoItens);
    } else {
      Serial.printf(" falhou rc=%d\n", mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  snprintf(topicoTotal, sizeof(topicoTotal), "smartcart/%s/total", CODIGO_CARRINHO);
  snprintf(topicoItens, sizeof(topicoItens), "smartcart/%s/itens", CODIGO_CARRINHO);

  tft.begin();
  tft.setRotation(1); // paisagem 320x240
  tft.fillScreen(ILI9341_BLACK);

  conectarWifi();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(aoReceberMqtt);

  if (WiFi.status() == WL_CONNECTED) {
    conectarMqtt();
  }

  desenharTela();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    conectarWifi();
  }

  if (WiFi.status() == WL_CONNECTED && !mqtt.connected()) {
    conectarMqtt();
  }

  mqtt.loop();
}
