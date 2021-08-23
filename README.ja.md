[![FIWARE Banner](https://fiware.github.io/tutorials.IoT-over-MQTT/img/fiware.png)](https://www.fiware.org/developers)
[![NGSI v2](https://img.shields.io/badge/NGSI-v2-5dc0cf.svg)](https://fiware-ges.github.io/orion/api/v2/stable/)

[![FIWARE IoT Agents](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/iot-agents.svg)](https://github.com/FIWARE/catalogue/blob/master/iot-agents/README.md)
[![License: MIT](https://img.shields.io/github/license/fiware/tutorials.IoT-over-MQTT.svg)](https://opensource.org/licenses/MIT)
[![Support badge](https://img.shields.io/badge/tag-fiware-orange.svg?logo=stackoverflow)](https://stackoverflow.com/questions/tagged/fiware)
[![UltraLight 2.0](https://img.shields.io/badge/Payload-Ultralight-27ae60.svg)](https://fiware-iotagent-ul.readthedocs.io/en/latest/usermanual/index.html#user-programmers-manual)
<br/> [![Documentation](https://img.shields.io/readthedocs/fiware-tutorials.svg)](https://fiware-tutorials.rtfd.io)

<!-- prettier-ignore -->

このチュートリアルでは、FIWARE に接続する IoT デバイスでの MQTT プロトコルの使用
を紹介します
。[以前のチュートリアル](https://github.com/FIWARE/tutorials.IoT-Agent) で作成し
た
、[UltraLight 2.0](https://fiware-iotagent-ul.readthedocs.io/en/latest/usermanual/index.html#user-programmers-manual)
IoT Agent は、[Mosquitto](https://mosquitto.org/) message broker を介して MQTT
を使用して一連のダミー IoT デバイスと通信するように再構成されます。

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/acfd27a941ed57a0cae5)

## 内容

<details>
<summary>詳細 <b>(クリックして拡大)</b></summary>

-   [MQTT とは何ですか？](#what-is-mqtt)
-   [アーキテクチャ](#architecture)
    -   [Mosquitto の設定](#mosquitto-configuration)
    -   [ダミー IoT デバイスの設定](#dummy-iot-devices-configuration)
    -   [IoT Agent for UltraLight 2.0 の設定](#iot-agent-for-ultralight-20-configuration)
-   [前提条件](#prerequisites)
    -   [Docker と Docker Compose](#docker-and-docker-compose)
    -   [Cygwin for Windows](#cygwin-for-windows)
-   [起動](#start-up)
-   [IoT Agent のプロビジョニング (Ultra Light over MQTT)](#provisioning-an-iot-agent-ultralight-over-mqtt)
    -   [Mosquitto Health の確認](#checking-mosquitto-health)
        -   [MQTT サブスクライバを開始 (:one:st ターミナル)](#start-an-mqtt-subscriber-onest-terminal)
        -   [MQTT パブリッシャを開始 (:two:nd ターミナル)](#start-an-mqtt-publisher-twond-terminal)
        -   [MQTT サブスクライバを停止 (:one:st ターミナル)](#stop-an-mqtt-subscriber-onest-terminal)
        -   [Mosquitto ログを表示](#show-mosquitto-log)
    -   [IoT Agent Service Health の確認](#checking-the-iot-agent-service-health)
    -   [IoT デバイスの接続](#connecting-iot-devices)
        -   [MQTT のサービス・グループのプロビジョニング](#provisioning-a-service-group-for-mqtt)
        -   [センサのプロビジョニング](#provisioning-a-sensor)
        -   [アクチュエータのプロビジョニング](#provisioning-an-actuator)
        -   [スマート・ドアのプロビジョニング](#provisioning-a-smart-door)
        -   [スマート・ランプのプロビジョニング](#provisioning-a-smart-lamp)
    -   [Context Broker コマンドの有効化](#enabling-context-broker-commands)
        -   [ベルを鳴らす](#ringing-the-bell)
        -   [スマート・ドアを開く](#opening-the-smart-door)
        -   [スマート・ランプの電源をオン](#switching-on-the-smart-lamp)
-   [次のステップ](#next-steps)

</details>

<a name="what-is-mqtt"></a>

# MQTT とは何ですか？

> "With the technology at our disposal, the possibilities are unbounded. All we
> need to do is make sure we keep talking."
>
> — Stephen Hawking

"MQTT は、IoT (Internet of Things) で使用される、パブリッシュ・サブスクライブ・ベ
ースのメッセージング・プロトコルです。これは TCP/IP プロトコルの上で動作し、"小
規模なコードのフットプリント"が必要な、またはネットワーク帯域幅が制限されている
遠隔地との接続用に設計されています。目標は、帯域幅効率が良く、バッテリ電力をほと
んど消費しないプロトコルを提供することです。"<sup>[1](#footnote1)</sup>

[以前のチュートリアル](https://github.com/FIWARE/tutorials.IoT-Agent) では、デバ
イスとの IoT Agent 間の転送メカニズムとして HTTP を使用していました。HTTP は、各
デバイスが IoT Agent に直接接続するリクエスト/レスポンスのパラダイムを使用します
。MQTT は、パブリッシュ・サブスクライブがイベント駆動型であり、メッセージをクラ
イアントにプッシュするという点で異なります。MQTT ブローカと呼ばれる、追加の中央
通信ポイントが必要です。このポイントは、送信側と正当な受信側間のすべてのメッセー
ジのディスパッチを担当します。ブローカにメッセージを発行する各クライアントには、
メッセージへの**トピック**が含まれています。**トピック**はブローカのルーティング
情報です。メッセージを受信する各クライアントは、特定の**トピック**にサブスクライ
ブし、ブローカは、一致する**トピック**を含むすべてのメッセージをクライアントに配
信します。したがって、クライアントはお互いに知り合う必要はなく、**トピック**にし
か関係しません。このアーキテクチャは、データ・プロデューサとデータ・コンシューマ
との間の依存性を伴わずに、スケーラビリティの高いソリューションを実現します。

2 つのトランスポート・プロトコルの違いの概要を以下に示します :

| HTTP トランスポート                                                                     | MQTT トランスポート                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ![](https://fiware.github.io/tutorials.IoT-over-MQTT/img/http.png)                      | ![](https://fiware.github.io/tutorials.IoT-over-MQTT/img/mqtt.png)                                |
| IoT Agent は IoT デバイスと**直接**通信します                                           | IoT Agent は、MQTT Broker を介して**間接的**に IoT デバイスと通信します                           |
| [Request-Response](https://en.wikipedia.org/wiki/Request%E2%80%93response) のパラダイム | [Publish-Subscribe](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) のパラダイム |
| IoT デバイスは、常に通信を受信する準備ができている必要があります                        | IoT デバイスは、いつ通信を受けるかを選択します                                                    |
| より高い消費電力要件                                                                    | 低消費電力要件                                                                                    |

UltraLight 2.0 IoT Agent は
、[UltraLight 2.0](https://fiware-iotagent-ul.readthedocs.io/en/latest/usermanual/index.html#user-programmers-manual)
構文を使用してメッセージを送信または解釈するだけですが、複数の**転送**メカニズム
を使用してメッセージを送受信するために使用できます。したがって、同じ FIWARE
Generic Enabler を使用して、より幅広い範囲の IoT デバイスに接続することができま
す。

#### Mosquitto MQTT Broker

[Mosquitto](https://mosquitto.org/) は、このチュートリアルで使用する、すぐに利用
できるオープンソースの MQTT ブローカです。EPL/EDL の下でライセンスされています。
詳細は、https://mosquitto.org/ をご覧ください。

#### デバイス・モニタ

このチュートリアルの目的のために、一連のダミー IoT デバイスが作成され、Context
Broker に接続されます。使用されるアーキテクチャとプロトコルの詳細は
、[IoT Sensors のチュートリアル](https://github.com/FIWARE/tutorials.IoT-Sensors/tree/NGSI-v2)に
あります。各デバイスの状態は、次の UltraLight デバイス・モニタの Web ページで確
認できます : `http://localhost:3000/device/monitor`

![FIWARE Monitor](https://fiware.github.io/tutorials.IoT-over-MQTT/img/device-monitor.png)

<a name="architecture"></a>

# アーキテクチャ

このアプリケーションは
、[以前のチュートリアル](https://github.com/FIWARE/tutorials.IoT-Agent/)で作成し
たコンポーネントに基づいています
。[Orion Context Broker](https://fiware-orion.readthedocs.io/en/latest/) と
[IoT Agent for UltraLight 2.0](https://fiware-iotagent-ul.readthedocs.io/en/latest/)
の 2 つの FIWARE コンポーネントを使用します。アプリケーションが _“Powered by
FIWARE”_ と認定されるには、Orion Context Broker を使用するだけで十分です。Orion
Context Broker と IoT Agent はオープンソースの
[MongoDB](https://www.mongodb.com/) 技術を利用して、保持している情報の永続性を保
ちます。 また、前回のチュートリアルで作成したダミー IoT デバイスも使用します。ま
た、オープンソースで、EPL/EDL で入手できる [Mosquitto](https://mosquitto.org/)
ブローカのインスタンスを追加します。

したがって、全体的なアーキテクチャは次の要素で構成されます :

-   FIWARE
    [Orion Context Broker](https://fiware-orion.readthedocs.io/en/latest/) は
    、[NGSI-v2](https://fiware.github.io/specifications/OpenAPI/ngsiv2) を使用して
    リクエストを受信します
-   FIWARE
    [IoT Agent for UltraLight 2.0](https://fiware-iotagent-ul.readthedocs.io/en/latest/)
    は以下を行います :
    -   [NGSI-v2](https://fiware.github.io/specifications/OpenAPI/ngsiv2) を使用し
        てサウス・バウンド・リクエストを受信し、MQTT Broker 用の
        [UltraLight 2.0](https://fiware-iotagent-ul.readthedocs.io/en/latest/usermanual/index.html#user-programmers-manual)
        の**トピック**に変換します
    -   登録された**トピック**について **MQTT Broker** をリッスンし、測定値をノ
        ース・バウンドに送信します
-   [Mosquitto](https://mosquitto.org/) **MQTT Broker** は、必要に応じて MQTT ト
    ピックを IoT Agent と IoT デ バイスの間でやりとりする中央通信ポイントとして
    機能します
-   [MongoDB](https://www.mongodb.com/) データベース :
    -   **Orion Context Broker** が、データ・エンティティ、サブスクリプション、
        レジストレーションなどのコンテキスト・データ情報を保持するために使用しま
        す
    -   **IoT Agent** がデバイスの URLs や Keys などのデバイス情報を保持するため
        に使用します
-   MQTT 上で動作する
    [UltraLight 2.0](https://fiware-iotagent-ul.readthedocs.io/en/latest/usermanual/index.html#user-programmers-manual)
    プロトコルを使用して
    、[ダミー IoT デバイス](https://github.com/FIWARE/tutorials.IoT-Sensors/tree/NGSI-v2)のセ
    ットとして機能する Web サーバー
-   このチュートリアルでは、**コンテキスト・プロバイダの NGSI proxy** は使用しま
    せん。これは以下を行います :
    -   [NGSI-v2](https://fiware.github.io/specifications/OpenAPI/ngsiv2) を使用し
        てリクエストを受信します
    -   独自の API を独自のフォーマットで使用して、公開されているデータ・ソース
        へのリクエストを行います
    -   [NGSI-v2](https://fiware.github.io/specifications/OpenAPI/ngsiv2) 形式でコ
        ンテキスト・データ を Orion Context Broker に返します
-   **在庫管理フロントエンド**は、このチュートリアルで使用していません。これは以
    下を行います :
    -   店舗情報を表示し、ユーザーがダミー IoT デバイスと対話できるようにします
    -   各店舗で購入できる商品を表示します
    -   ユーザが製品を購入して在庫数を減らすことを許可します

要素間のすべての対話は TCP を介して HTTP または MQTT リクエストによって開始され
るため、エンティティはコンテナ化され、公開されたポートから実行されます。

![](https://fiware.github.io/tutorials.IoT-over-MQTT/img/architecture.png)

Mosquitto MQTT Broker, IoT デバイス, IoT Agent を接続するために必要な設定情報は
、関連する `docker-compose.yml` ファイルの services セクションにあります :

<a name="mosquitto-configuration"></a>

## Mosquitto の設定

```yaml
mosquitto:
    image: eclipse-mosquitto
    hostname: mosquitto
    container_name: mosquitto
    networks:
        - default
    expose:
        - "1883"
        - "9001"
    ports:
        - "1883:1883"
        - "9001:9001"
    volumes:
        - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf
```

`mosquitto` コンテナは、2 つのポートでリッスンしています :

-   ポート `1883` は、MQTT の**トピック**をポストできるように公開されています
-   ポート `9001` は、HTTP/Websocket 通信の標準ポートです

volumes の設定は、MQTT message broker のデバッグ・レベルを上げるために使用され
る[設定ファイル](https://github.com/FIWARE/tutorials.IoT-over-MQTT/blob/master/mosquitto/mosquitto.conf)で
す。

<a name="dummy-iot-devices-configuration"></a>

## ダミー IoT デバイスの設定

```yaml
tutorial:
    image: fiware/tutorials.context-provider
    hostname: iot-sensors
    container_name: fiware-tutorial
    networks:
        - default
    expose:
        - "3000"
        - "3001"
    ports:
        - "3000:3000"
        - "3001:3001"
    environment:
        - "DEBUG=tutorial:*"
        - "WEB_APP_PORT=3000"
        - "DUMMY_DEVICES_PORT=3001"
        - "DUMMY_DEVICES_API_KEY=4jggokgpepnvsb2uv4s40d59ov"
        - "DUMMY_DEVICES_TRANSPORT=MQTT"
```

`tutorial` コンテナは、2 つのポートでリッスンしています :

-   ポート `3000` が公開されているので、ダミー IoT デバイスを表示する Web ページ
    が表示されます
-   ポート `3001` はチュートリアルのアクセスのためだけに公開されているため、cUrl
    または Postman は同じネットワーク以外からも、UltraLight コマンドを作成できま
    す

`tutorial` コンテナは、次のように環境変数によって設定値を指定できます :

| キー                    | 値                           | 説明                                                                                                                                              |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEBUG                   | `tutorial:*`                 | ロギングに使用するデバッグ・フラグ                                                                                                                |
| WEB_APP_PORT            | `3000`                       | ダミー・デバイスのデータを表示する web-app が使用するポート                                                                                       |
| DUMMY_DEVICES_PORT      | `3001`                       | コマンドを受信するためにダミー IoT デバイスが使用するポート                                                                                       |
| DUMMY_DEVICES_API_KEY   | `4jggokgpepnvsb2uv4s40d59ov` | UltraLight インタラクションに使用されるランダムなセキュリティキー - デバイスと IoT Agent 間のインタラクションの完全性を保証するために使用されます |
| DUMMY_DEVICES_TRANSPORT | `MQTT`                       | ダミー IoT デバイスによって使用されるトランスポート・プロトコル                                                                                   |

このチュートリアルでは、YAML ファイルで記述されている他の `tutorial` コンテナの
設定値は使用しません。

<a name="iot-agent-for-ultralight-20-configuration"></a>

## IoT Agent for UltraLight 2.0 の設定

[IoT Agent for UltraLight 2.0](https://fiware-iotagent-ul.readthedocs.io/en/latest/)
は 、Docker コンテナ内でインスタンス化できます。公式の Docker イメージは、Docker
Hub からタグ付けされた `fiware/iotagent-ul` です。必要な構成を以下に示します :

```yaml
iot-agent:
    image: fiware/iotagent-ul:latest
    hostname: iot-agent
    container_name: fiware-iot-agent
    depends_on:
        - mongo-db
    networks:
        - default
    expose:
        - "4041"
    ports:
        - "4041:4041"
    environment:
        - IOTA_CB_HOST=orion
        - IOTA_CB_PORT=1026
        - IOTA_NORTH_PORT=4041
        - IOTA_REGISTRY_TYPE=mongodb
        - IOTA_LOG_LEVEL=DEBUG
        - IOTA_TIMESTAMP=true
        - IOTA_CB_NGSI_VERSION=v2
        - IOTA_AUTOCAST=true
        - IOTA_MONGO_HOST=mongo-db
        - IOTA_MONGO_PORT=27017
        - IOTA_MONGO_DB=iotagentul
        - IOTA_PROVIDER_URL=http://iot-agent:4041
        - IOTA_MQTT_HOST=mosquitto
        - IOTA_MQTT_PORT=1883
```

`iot-agent` コンテナは、Orion Context Broker の 存在に依存し、そのようなデバイス
の URLs 及び Keys としてデバイス情報を保持するために MongoDB データベースを使用
します。コンテナは 1 つのポートで待機しています :

-   ポート 4041 は、チュートリアルのアクセスのためだけに公開されているため、cUrl
    または Postman は同じネットワーク以外からも、プロビジョニング・コマンドを作
    成できます

`iot-agent` コンテナは、次のように環境変数によって設定値を指定できます :

| キー                 | 値                      | 説明                                                                                                                                   |
| ------------------   | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| IOTA_CB_HOST         | `orion`                 | コンテキストを更新する Context Broker のホスト名                                                                                       |
| IOTA_CB_PORT         | `1026`                  | Context Broker がコンテキストを更新するためにリッスンするポート                                                                        |
| IOTA_NORTH_PORT      | `4041`                  | IoT Agent の設定および Context Broker からのコンテキスト更新の受信に使用されるポート                                                   |
| IOTA_REGISTRY_TYPE   | `mongodb`               | メモリまたはデータベースに IoT デバイス情報を保持するかどうかを指定                                                                    |
| IOTA_LOG_LEVEL       | `DEBUG`                 | IoT Agent のログ・レベル                                                                                                               |
| IOTA_TIMESTAMP       | `true`                  | 接続されたデバイスから受信した各測定値にタイムスタンプ情報を提供するかどうかを指定                                                     |
| IOTA_CB_NGSI_VERSION | `v2`                    | アクティブな属性の更新を送信するときにNGSI v2 を使用するように指定するかどうか                                                         |
| IOTA_AUTOCAST        | `true`                  | Ultralight の数値が文字列ではなく数値として読み取られるようにする                                                                      |
| IOTA_MONGO_HOST      | `context-db`            | mongoDB のホスト名 - デバイス情報を保持するために使用                                                                                  |
| IOTA_MONGO_PORT      | `27017`                 | mongoDB はリッスンしているポート                                                                                                       |
| IOTA_MONGO_DB        | `iotagentul`            | mongoDB で使用されるデータベースの名前                                                                                                 |
| IOTA_PROVIDER_URL    | `http://iot-agent:4041` | コマンドが登録されたときに Context Broker に渡された URL。Context Broker がデバイスにコマンドを発行したときに転送 URL の場所として使用 |
| IOTA_MQTT_HOST       | `mosquitto`             | MQTT Broker のホスト名                                                                                                                 |
| IOTA_MQTT_PORT       | `1883`                  | MQTT Broker がトピックを受信するためにリッスンしているポート                                                                           |

ご覧のように、MQTT トランスポートの使用は、2 つの環境変数 `IOTA_MQTT_HOST` と
`IOTA_MQTT_PORT` によってのみ制御されます。

<a name="prerequisites"></a>

# 前提条件

<a name="docker-and-docker-compose"></a>

## Docker と Docker Compose

物事を単純にするために、両方のコンポーネントが [Docker](https://www.docker.com)
を使用して実行されます。**Docker** は、さまざまコンポーネントをそれぞれの環境に
分離することを可能にするコンテナ・テクノロジです。

-   Docker Windows にインストールするには
    、[こちら](https://docs.docker.com/docker-for-windows/)の手順に従ってくださ
    い
-   Docker Mac にインストールするには
    、[こちら](https://docs.docker.com/docker-for-mac/)の手順に従ってください
-   Docker Linux にインストールするには
    、[こちら](https://docs.docker.com/install/)の手順に従ってください

**Docker Compose** は、マルチコンテナ Docker アプリケーションを定義して実行する
ためのツールです
。[YAML file](https://raw.githubusercontent.com/Fiware/tutorials.IoT-over-MQTT/master/docker-compose.yml)
ファイルは、アプリケーションのために必要なサービスを構成するために使用します。つ
まり、すべてのコンテナ・サービスは 1 つのコマンドで呼び出すことができます
。Docker Compose は、デフォルトで Docker for Windows と Docker for Mac の一部と
してインストールされますが、Linux ユーザ
は[ここ](https://docs.docker.com/compose/install/)に記載されている手順に従う必要
があります。

次のコマンドを使用して、現在の **Docker** バージョンと **Docker Compose** バージ
ョンを確認できます :

```console
docker-compose -v
docker version
```

Docker バージョン 18.03 以降と Docker Compose 1.29 以上を使用していることを確認
し、必要に応じてアップグレードしてください。

<a name="cygwin-for-windows"></a>

## Cygwin for Windows

シンプルな bash スクリプトを使用してサービスを開始します。Windows ユーザは
[cygwin](http://www.cygwin.com/) をダウンロードして、Windows 上の Linux ディスト
リビューションと同様のコマンドライン機能を提供する必要があります。

<a name="start-up"></a>

# 起動

開始する前に、必要な Docker イメージをローカルで取得または構築しておく必要があり
ます。リポジトリを複製し、以下のコマンドを実行して必要なイメージを作成してくださ
い :

```console
git clone https://github.com/FIWARE/tutorials.IoT-over-MQTT.git
cd tutorials.IoT-over-MQTT
git checkout NGSI-v2

./services create
```

その後、リポジトリ内で提供される
[services](https://github.com/FIWARE/tutorials.IoT-over-MQTT/blob/NGSI-v2/services)
Bash スクリプトを実行することによって、コマンドラインからすべてのサービスを初期
化することができます :

```console
./services start
```

> :information_source: **注:** クリーンアップをやり直したい場合は、次のコマンド
> を使用して再起動することができます :
>
> ```console
> ./services stop
> ```

<a name="provisioning-an-iot-agent-ultralight-over-mqtt"></a>

# IoT Agent のプロビジョニング (Ultra Light over MQTT)

チュートリアルを正しく実行するには、ブラウザのデバイス・モニタページが表示されて
いることを確認し、ページをクリックして cUrl コマンドを入力する前にオーディオを有
効にしてください。デバイス・モニタには、Ultralight 2.0 構文を使用して、ダミー
IoT デバイスのアレイの現在の状態が表示されます。

#### デバイス・モニタ

デバイス・モニタは次の場所にあります : `http://localhost:3000/device/monitor`

<a name="checking-mosquitto-health"></a>

## Mosquitto Health の確認

まず、IoT Agent と ダミー IoT デバイスの役割を模倣し、MQTT を使用していくつかの
メッセージを送受信します。このチュートリアルのこのセクションでは、いくつかのオー
プン・ターミナルが必要です。

<a name="start-an-mqtt-subscriber-onest-terminal"></a>

### MQTT サブスクライバを開始 (:one:st ターミナル)

最終的にシステムによって正しく接続されると、IoT Agent は関連するすべてのイベント
にサブスクライブし、センサの測定値の形式でノース・バウンドのトラフィックを待ち受
けます。したがって、すべてのトピックを対象にサブスクリプションを作成する必要があ
ります。同様に、アキュエーターは、コマンドがサウス・バウンドで送信されたときにそ
れ自体に影響を及ぼすイベントを受け取るために、単一のトピックにサブスクライブする
必要があります。コミュニケーションのラインが開いていることを確認するには、特定の
トピックをサブスクライブして、メッセージが公開されたときに何かを受け取れるかどう
かを確認します。

**新しいターミナル**を開き、次のように新しい `mqtt-subscriber` の Docker コンテ
ナを作成します :

```console
docker run -it --rm --name mqtt-subscriber \
  --network fiware_default efrecon/mqtt-client sub -h mosquitto -t "/#"
```

ターミナルはイベントを受信する準備ができます。

<a name="start-an-mqtt-publisher-twond-terminal"></a>

### MQTT パブリッシャを開始 (:two:nd ターミナル)

ノース・バウンドの測定値を送信するセンサは、**MQTT Broker** へ測定値を公開して、
サブスクライバに送信することができます。センサはサブスクライバに直接接続する必要
はありません。

**新しいターミナル**を開き、次のように `mqtt-publisher` の Docker コンテナを実行
してメッセージを送信します :

```console
docker run -it --rm --name mqtt-publisher \
  --network fiware_default efrecon/mqtt-client pub -h mosquitto -m "HELLO WORLD" -t "/test"
```

#### :one:st ターミナル - 結果 :

MQTT Broker が正常に機能している場合は、メッセージを別のターミナルで受信する必要
があります :

```
HELLO WORLD
```

<a name="stop-an-mqtt-subscriber-onest-terminal"></a>

### MQTT サブスクライバを停止 (:two:nd ターミナル)

MQTT サブスクライバを終了するには、次の Docker コマンドを実行します :

```console
docker stop mqtt-subscriber
```

<a name="show-mosquitto-log"></a>

### Mosquitto ログを表示

通信が **MQTT Broker** を介して行われたことを示すために、次のように `mosquitto`
の Docker コンテナのログを検査することができます :

```console
docker logs --tail 10 mosquitto
```

#### 結果 :

```
1529661883: New client connected from 172.18.0.5 as mqttjs_8761e518 (c1, k0).
1529662472: New connection from 172.18.0.7 on port 1883.
1529662472: New client connected from 172.18.0.7 as mosqpub|1-5637527c63c1 (c1, k60).
1529662472: Client mosqpub|1-5637527c63c1 disconnected.
1529662614: New connection from 172.18.0.7 on port 1883.
1529662614: New client connected from 172.18.0.7 as mosqsub|1-64b27d675f58 (c1, k60).
1529662623: New connection from 172.18.0.8 on port 1883.
1529662623: New client connected from 172.18.0.8 as mosqpub|1-ef03e74b0270 (c1, k60).
1529662623: Client mosqpub|1-ef03e74b0270 disconnected.
1529667841: Socket error on client mosqsub|1-64b27d675f58, disconnecting.
```

<a name="checking-the-iot-agent-service-health"></a>

## IoT Agent Service Health の確認

IoT Agent が動作しているかどうかは、公開されているポートに対して HTTP リクエスト
を行うことで確認できます :

#### :one: リクエスト :

```console
curl -X GET \
  'http://localhost:4041/iot/about'
```

レスポンスは次のようになります :

```json
{
    "libVersion": "2.6.0-next",
    "port": "4041",
    "baseRoot": "/",
    "version": "1.6.0-next"
}
```

> **`Failed to connect to localhost port 4041: Connection refused` のレスポンス
> を受け取ったらどうしますか？**
>
> `Connection refused` レスポンスを受け取った場合、IoT Agent がこのチュートリア
> ルで期待される場所には見つかりません。各 cUrl コマンドの URL とポートを正しい
> IP アドレスで置き換える必要があります。すべての cUrl コマンドのチュートリアル
> では、`localhost:4041` で IoT Agent が使用可能であると想定しています。
>
> 以下の対策を試してください :
>
> -   Docker コンテナが動作していることを確認するには、次のようにしてください :
>
> ```console
> docker ps
> ```
>
> 実行中の 4 つのコンテナが表示されます。IoT Agent が実行されていない場合は、必
> 要に応じてコンテナを再起動できます。このコマンドは、開いているポート情報も表示
> します
>
> -   [`docker-machine`](https://docs.docker.com/machine/) と
>     [Virtual Box](https://www.virtualbox.org/) をインストールしている場合は
>     、Context Broker, IoT Agent および ダミー IoT デバイスの Docker コンテナが
>     別の IP アドレスで実行されている可能性があります。次に示すように仮想ホスト
>     IP を取得する必要があります :
>
> ```console
> curl -X GET \
> 'http://$(docker-machine ip default):4041/version'
> ```
>
> または、コンテナ・ネットワーク内からすべての curl コマンドを実行します :
>
> ```console
> docker run --network fiware_default --rm appropriate/curl -s \
>  -X GET 'http://iot-agent:4041/iot/about'
> ```

<a name="connecting-iot-devices"></a>

## IoT デバイスの接続

IoT Agent は、IoT デバイスと Context Broker との間のミドルウェアとして機能します
。したがって、ユニークな ID を持つコンテキスト・データのエンティティを作成できる
必要があります。サービスがプロビジョニングされ、未知のデバイスが測定を行うと、デ
バイスが認識され、既知の ID にマッピングされない限り、IoT Agent は、 提供された
`<device-id>` を使用してこれをコンテキストに追加します。

すべての IoT デバイス `<device-id>` が常に一意であるという保証はないため、IoT
Agent へのすべてのプロビジョニングのリクエストには、2 つの必須ヘッダーが必要です
:

-   `fiware-service` ヘッダは、特定のサービスのエンティティを別の mongoDB データ
    ベースに保持できるように定義されています
-   `fiware-servicepath` は、デバイスのアレイを区別するために使用できます

たとえば、スマート・シティのアプリケーションでは、さまざまな部門 (公演、交通機関
、ごみ収集など) ごとに異なる `fiware-service` ヘッダが必要であり、それぞれ
`fiware-servicepath` が特定の公園などを参照します。これは、各サービスのデータと
デバイスが必要に応じて識別され、分離されることを意味しますが、データはサイロ化さ
れません。たとえば公園内の**スマート・ビン**のデータは、ゴミ箱 の **GPS ユニッ
ト**と組み合わせて、効率的な方法でトラックのルートを変更することができます。

**スマート・ビン**と **GPS ユニット**は、さまざまなメーカから来る可能性が高く、
使用される `<device-id>`s に重複がないことは保証できません。`fiware-service` ヘ
ッダ と `fiware-servicepath` ヘッダの使用は、 これが常に当てはまることを保証し
、Context Broker がコンテキスト・データの元のソースを識別することを可能にします
。

<a name="provisioning-a-service-group-for-mqtt"></a>

### MQTT のサービス・グループのプロビジョニング

グループのプロビジョンを呼び出すことは、常にデバイスを接続する最初のステップです
。MQTT 通信では、プロビジョニングによって認証キーが提供されるため、IoT Agent は
サブスクライブする**トピック**を認識します。

すべてのデバイスにデフォルトのコマンドと属性を設定することもできますが、このチュ
ートリアルでは各デバイスを個別にプロビジョニングするため、これは行われません。

この例では、匿名のデバイス・グループをプロビジョニングします。IoT Agent に、一連
のデバイスが `/4jggokgpepnvsb2uv4s40d59ov` トピックにメッセージを送信して通信す
ることを通知します。

HTTP 通信が使用されていないため、`resource` 属性は空白のままになります
。`cbroker` の URL の場所はオプションの属性です。IoT Agent が提供されていない場
合、 IoT Agent は設定ファイルで定義されているデフォルトの context broker URL を
使用しますが、完全性のためにここに追加されています。

#### :two: リクエスト :

```console
curl -iX POST \
  'http://localhost:4041/iot/services' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
 "services": [
   {
     "apikey":      "4jggokgpepnvsb2uv4s40d59ov",
     "cbroker":     "http://orion:1026",
     "entity_type": "Thing",
     "resource":    ""
   }
 ]
}'
```

<a name="provisioning-a-sensor"></a>

### センサのプロビジョニング

エンティティを作成するときは、NGSI-LD
[仕様](https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.04.01_60/gs_cim009v010401p.pdf)に
従って URN を使用するのが一般的な良い方法です。さらに、データ属性を定義するとき
に意味のある名前を理解する方が簡単です。これらのマッピングは、デバイスを個別にプ
ロビジョニングすることによって定義できます。

3 つのタイプの測定属性をプロビジョニングできます :

-   `attributes` は、デバイスからのアクティブな読み取りです
-   `lazy` 属性はリクエストに応じて送信されます。IoT Agent は測定結果を返すよう
    にデバイスに通知します
-   `static_attributes` は、Context Broker に渡されるデバイスに関する静的なデー
    タ(リレーションシップなど)を示す名前です

> **注 :** 個別 id が必要でないか、または集約されたデータが十分である場合は
> 、`attributes` は個別にではなくプロビジョニング・サービス内で定義できます。

#### :three: リクエスト :

```console
curl -iX POST \
  'http://localhost:4041/iot/devices' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
 "devices": [
   {
     "device_id":   "motion001",
     "entity_name": "urn:ngsi-ld:Motion:001",
     "entity_type": "Motion",
     "protocol":    "PDI-IoTA-UltraLight",
     "transport":   "MQTT",
     "timezone":    "Europe/Berlin",
     "attributes": [
       { "object_id": "c", "name": "count", "type": "Integer" }
     ],
     "static_attributes": [
       { "name":"refStore", "type": "Relationship", "value": "urn:ngsi-ld:Store:001"}
     ]
   }
 ]
}
'
```

リクエストでは、デバイス `motion001` を URN `urn:ngsi-ld:Motion:001` に関連付け
、コンテキスト属性 `ccount` (これは `Integer` と定義されています) を持つ デバイ
ス読み込み `c` をマッピングします。`refStore` は `static_attribute` として定義さ
れ、デバイスを **Store** `urn:ngsi-ld:Store:001` 内に配置します。

リクエストのボディに `transport=MQTT` 属性を追加するだけで、IoT Agent に測定を受
け取るために、`/<api-key>/<device-id>` **トピック**に登録する必要があることを通
知するのに十分です。

次の**トピック**に MQTT メッセージをポストすることで、**モーション・センサ** の
デバイス `motion001` からのダミー IoT デバイスの測定値をシミュレートできます。

#### :four: MQTT リクエスト :

```console
docker run -it --rm --name mqtt-publisher --network \
  fiware_default efrecon/mqtt-client pub -h mosquitto -m "c|1" \
  -t "/4jggokgpepnvsb2uv4s40d59ov/motion001/attrs"
```

-   `-m`パラメータの値によってメッセージが定義されます。これは Ultra Light の構
    文です
-   `-t` パラメータの値によって**トピック**が定義されます

**トピック**は、次の形式でなければなりません :

```
/<api-key>/<device-id>/attrs
```

> **注** [以前のチュートリアル](https://github.com/FIWARE/tutorials.IoT-Agent)で
> 、モーション・センサと IoT Agent との間の HTTP 接続性をテストするとき、同様の
> ダミー HTTP リクエストが送られて、`count` 値が更新されました。今回は、IoT
> Agent が MQTT トピックをリッスンするように構成されており、MQTT トピックにダミ
> ー・メッセージをポストする必要があります。

MQTT トランスポート・プロトコルを使用する場合、IoT Agent は MQTT **トピ
ック**をサブスクライブし、デバイス・モニタは各**トピック**に送信されたすべての
MQTT **メッセージ**を表示するように構成されます。効果的に Mosquitto が送受信する
リスト・メッセージを表示します。

MQTT を介して接続された IoT Agent を使用して、サービス・グループはエージェントが
サブスクライブしている**トピック**を定義しています。api-key が**トピック**のルー
トと一致するので、**モーション・センサ**からの MQTT メッセージは、以前にサブスク
ライブした IoT Agent に渡されます。

特にデバイス (`motion001`) をプロビジョニングしたので、IoT Agent は、Orion
Context Broker でリクエストを発行する前に属性をマップできます。

Context Broker からエンティティ・データを取得することで、測定値が記録されたこと
確認できます。`fiware-service` ヘッダと `fiware-service-path` ヘッダを追加する
ことを忘れないでください。

#### :five: リクエスト :

```console
curl -X GET \
  'http://localhost:1026/v2/entities/urn:ngsi-ld:Motion:001?type=Motion' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /'
```

#### レスポンス :

```json
{
    "id": "urn:ngsi-ld:Motion:001",
    "type": "Motion",
    "TimeInstant": {
        "type": "ISO8601",
        "value": "2018-05-25T10:51:32.00Z",
        "metadata": {}
    },
    "count": {
        "type": "Integer",
        "value": "1",
        "metadata": {
            "TimeInstant": {
                "type": "ISO8601",
                "value": "2018-05-25T10:51:32.646Z"
            }
        }
    }
}
```

レスポンスは、`id=motion001` の**モーション・センサ**のデバイスが IoT Agent によ
って正常に識別され、エンティティ `id=urn:ngsi-ld:Motion:001` にマッピングされて
いることを示します。この新しいエンティティは、コンテキスト・データ内で作成されま
した。ダミー IoT デバイスの測定リクエストからの `c` 属性は、コンテキスト内のより
意味のある `count` 属性にマップされています。お気づきのように、`TimeInstant` 属
性がエンティティと属性のメタデータの両方に追加されました。これはエンティティと属
性が最後に更新された時刻を表し、`IOTA_TIMESTAMP` 環境変数が IoT Agent の起動時に
設定されます。

<a name="provisioning-an-actuator"></a>

### アクチュエータのプロビジョニング

アクチュエータのプロビジョニングは、センサのプロビジョニングと同様です
。`transport=MQTT` 属性は、使用される通信プロトコルを定義します。MQTT 通信の場合
、`endpoint` は、デバイスがコマンドをリッスンしている HTTP url がないため、属性
は不要です。コマンドのアレイは、`/<api-key>/<device-id>/cmd` **トピック**に送信
されるメッセージに直接マップされます。`commands` アレイには、呼び出すことができ
る各コマンドのリストが含まれています。

以下の例では、`deviceId = bell001` のベルがプロビジョニングされています。

#### :six: リクエスト :

```console
curl -iX POST \
  'http://localhost:4041/iot/devices' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
  "devices": [
    {
      "device_id": "bell001",
      "entity_name": "urn:ngsi-ld:Bell:001",
      "entity_type": "Bell",
      "protocol": "PDI-IoTA-UltraLight",
      "transport": "MQTT",
      "commands": [
        { "name": "ring", "type": "command" }
       ],
       "static_attributes": [
         {"name":"refStore", "type": "Relationship","value": "urn:ngsi-ld:Store:001"}
      ]
    }
  ]
}
'
```

Context Broker を接続する前に、`/v2/op/update` エンドポイントを使用して、IoT
Agent のノース・ポートに直接 REST リクエストを行うことで、IoT Agent からデバイス
にコマンドを送信できることをテストできます。Context Broker に接続すると、最終的
に Context Broker によって呼び出されるのは、このエンドポイントです。設定をテスト
するには、次のようにコマンドを直接実行します :

#### :seven: リクエスト :

```console
curl -iX POST \
  http://localhost:4041/v2/op/update \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
    "actionType": "update",
    "entities": [
        {
            "type": "Bell",
            "id": "urn:ngsi-ld:Bell:001",
            "ring" : {
                "type": "command",
                "value": ""
            }
        }
    ]
}'
```

デバイス・モニタのページを表示している場合は、ベル変更の状態も表示できます。

![](https://fiware.github.io/tutorials.IoT-over-MQTT/img/bell-ring.gif)

ベルを鳴らすコマンドの結果は、Orion Context Broker 内のエンティティにクエリする
ことによって読み取ることができます。

#### :eight: リクエスト :

```console
curl -X GET \
  'http://localhost:1026/v2/entities/urn:ngsi-ld:Bell:001?type=Bell&options=keyValues' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /'
```

#### レスポンス :

```json
{
    "id": "urn:ngsi-ld:Bell:001",
    "type": "Bell",
    "TimeInstant": "2018-05-25T20:06:28.00Z",
    "refStore": "urn:ngsi-ld:Store:001",
    "ring_info": " ring OK",
    "ring_status": "OK",
    "ring": ""
}
```

`TimeInstant` は、エンティティに関連付けられたコマンドが呼び出された時刻を最後に
表示します。リング・コマンドの結果を `ring_info` 属性の値で見ることができます。

<a name="provisioning-a-smart-door"></a>

### スマート・ドアのプロビジョニング

コマンドと測定の両方を提供するデバイスをプロビジョニングするだけでは、リクエスト
のボディに `attributes` 属性と `command` 属性の両方を含む HTTP POST リクエストを
作成するだけです。再度、`transport=MQTT` 属性は、使用される通信プロトコルを定義
します。デバイスがコマンドをリッスンする HTTP url がないため、`endpoint` 属性は
必要ありません。

#### :nine: リクエスト :

```console
curl -iX POST \
  'http://localhost:4041/iot/devices' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
  "devices": [
    {
      "device_id": "door001",
      "entity_name": "urn:ngsi-ld:Door:001",
      "entity_type": "Door",
      "protocol": "PDI-IoTA-UltraLight",
      "transport": "MQTT",
      "commands": [
        {"name": "unlock","type": "command"},
        {"name": "open","type": "command"},
        {"name": "close","type": "command"},
        {"name": "lock","type": "command"}
       ],
       "attributes": [
        {"object_id": "s", "name": "state", "type":"Text"}
       ],
       "static_attributes": [
         {"name":"refStore", "type": "Relationship","value": "urn:ngsi-ld:Store:001"}
       ]
    }
  ]
}
'
```

<a name="provisioning-a-smart-lamp"></a>

### スマート・ランプのプロビジョニング

同様に、2 つのコマンド (`on` および `off`) と 2 つの属性を持つ**スマート・ラン
プ**は、次のようにプロビジョニングできます :

#### :one::zero: リクエスト :

```console
curl -iX POST \
  'http://localhost:4041/iot/devices' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
  "devices": [
    {
      "device_id": "lamp001",
      "entity_name": "urn:ngsi-ld:Lamp:001",
      "entity_type": "Lamp",
      "protocol": "PDI-IoTA-UltraLight",
      "transport": "MQTT",
      "commands": [
        {"name": "on","type": "command"},
        {"name": "off","type": "command"}
       ],
       "attributes": [
        {"object_id": "s", "name": "state", "type":"Text"},
        {"object_id": "l", "name": "luminosity", "type":"Integer"}
       ],
       "static_attributes": [
         {"name":"refStore", "type": "Relationship","value": "urn:ngsi-ld:Store:001"}
      ]
    }
  ]
}
'
```

プロビジョニングされたデバイスの完全なリストは、`/iot/devices` エンドポイントに
GET リクエストを行うことで取得できます。

#### :one::one: リクエスト :

```console
curl -X GET \
  'http://localhost:4041/iot/devices' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /'
```

<a name="enabling-context-broker-commands"></a>

## Context Broker コマンドの有効化

IoT Agent を IoT デバイスに接続すると、Orion Context Broker にコマンドが利用可能に
なったことが通知されました。つまり、IoT Agent は、コマンド属性の
[コンテキスト・プロバイダ](https://github.com/FIWARE/tutorials.Context-Providers/)
として自身を登録しました。

コマンドが登録されると
、[以前のチュートリアル](https://github.com/FIWARE/tutorials.IoT-Sensors/tree/NGSI-v2)で実行
したように、IoT デバイスに直接 UltraLight 2.0 リクエストを送信するのではなく
、**ベル**を鳴らし、**スマート・ドア**を開閉し、**スマート・ランプ**をオン/オフ
に切り替えることができます。

IoT Agent のノース・ポートのすべての通信は、標準の NGSI 構文を使用します。IoT デ
バイスと Iot Agent 間で使用されるトランスポート・プロトコルは、この通信レイヤと
は無関係です。 効果的に、IoT Agent は、任意のデバイスを作動させるための既知のエ
ンドポイントの単純化されたファサード・パターンを提供しています。

したがって、コマンドの登録と呼び出しをするこのセクションでは
、[以前のチュートリアル](https://github.com/FIWARE/tutorials.IoT-Agent)のインス
トラクションと**重複**しています

<a name="ringing-the-bell"></a>

### ベルを鳴らす

`ring` コマンドを呼び出すには、コンテキスト内で `ring` 属性を更新する必要があり
ます。

#### :one::two: リクエスト :

```console
curl -iX PATCH \
  'http://localhost:1026/v2/entities/urn:ngsi-ld:Bell:001/attrs' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
  "ring": {
      "type" : "command",
      "value" : ""
  }
}'
```

デバイス・モニタのページを表示している場合は、ベル変更の状態も表示できます。

![](https://fiware.github.io/tutorials.IoT-over-MQTT/img/bell-ring.gif)

<a name="opening-the-smart-door"></a>

### スマート・ドアを開く

`open` コマンドを呼び出すには、コンテキスト内で `open` 属性を更新する必要があり
ます。

#### :one::three: リクエスト :

```console
curl -iX PATCH \
  'http://localhost:1026/v2/entities/urn:ngsi-ld:Door:001/attrs' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
  "open": {
      "type" : "command",
      "value" : ""
  }
}'
```

<a name="switching-on-the-smart-lamp"></a>

### スマート・ランプの電源をオン

**スマート・ランプ**をオンにするには、`on` 属性をコンテキストで更新する必要があ
ります。

#### :one::four: リクエスト :

```console
curl -iX PATCH \
  'http://localhost:1026/v2/entities/urn:ngsi-ld:Lamp:001/attrs' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
  "on": {
      "type" : "command",
      "value" : ""
  }
}'
```

<a name="next-steps"></a>

# 次のステップ

高度な機能を追加することで、アプリケーションに複雑さを加える方法を知りたいですか
？このシリーズ
の[他のチュートリアル](https://www.letsfiware.jp/fiware-tutorials)を読むことで見
つけることができます :

---

## License

[MIT](LICENSE) © 2018-2020 FIWARE Foundation e.V.

---

### 脚注

<a name="footnote1"></a>

-   [Wikipedia: MQTT](https://en.wikipedia.org/wiki/MQTT) - サービス間のすべての
メッセージのディスパッチを担当する MQTT ブローカーと呼ばれる中央通信ポイント
