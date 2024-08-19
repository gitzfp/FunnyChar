# <img src="https://storage.googleapis.com/assistly/static/funnychar/funnychar.svg" height="24px" style="padding-top:4px"/>FunnyChar - 实时 AI 角色

## 🎯 主要功能

- **易于使用**：无需编码即可创建自己的 AI 角色。
- **可定制**：可以自定义 AI 角色的个性、背景，甚至是声音。
- **实时**：可以实时与 AI 角色对话或发送消息。
- **多平台**：可以在网页、终端和移动设备上与 AI 角色互动（我们开源了移动应用）。
- **最新 AI 技术**：我们使用最新的 AI 技术来驱动你的 AI 角色，包括 OpenAI、Anthropic Claude 2、Chroma、Whisper、ElevenLabs 等。
- **模块化**：可以轻松更换不同模块以定制你的流程。更少的意见，更大的灵活性。是开始 AI 工程师之旅的绝佳项目。

## 🔬 技术栈

<div align="center">
    <img src="https://storage.googleapis.com/assistly/static/funnychar/techstackv004.jpg" alt="FunnyChar-tech-stack" width="100%"  style="padding: 20px"/>
</div>

- ✅**网页**： [React JS](https://react.dev/), [Vanilla JS](http://vanilla-js.com/), [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- ✅**移动**： [Swift](https://developer.apple.com/swift/), [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- ✅**后台**： [FastAPI](https://fastapi.tiangolo.com/), [SQLite](https://www.sqlite.org/index.html), [Docker](https://www.docker.com/)
- ✅**数据摄取**： [LlamaIndex](https://www.llamaindex.ai/), [Chroma](https://www.trychroma.com/)
- ✅**LLM 协调**： [LangChain](https://langchain.com/), [Chroma](https://www.trychroma.com/)
- ✅**LLM**： [ReByte](https://rebyte.ai/), [OpenAI GPT3.5/4](https://platform.openai.com/docs/api-reference/chat), [Anthropic Claude 2](https://docs.anthropic.com/claude/docs/getting-started-with-claude), [Anyscale Llama2](https://docs.endpoints.anyscale.com/supported-models/meta-llama-Llama-2-70b-chat-hf)
- ✅**语音转文本**： [Local WhisperX](https://github.com/m-bain/whisperX), [Local Whisper](https://github.com/openai/whisper), [OpenAI Whisper API](https://platform.openai.com/docs/api-reference/audio), [Google Speech to Text](https://cloud.google.com/speech-to-text/docs#docs)
- ✅**文本转语音**： [ElevenLabs](https://beta.elevenlabs.io/), [Edge TTS](https://github.com/rany2/edge-tts), [Google Text to Speech](https://cloud.google.com/text-to-speech?hl=en)
- ✅**声音克隆**： [ElevenLabs](https://beta.elevenlabs.io/voice-lab)

## 📚 与现有产品比较

<div align="center">
    <img src="https://storage.googleapis.com/assistly/static/funnychar/compare.png">
</div>

## 📀 快速开始 - 使用 Docker 安装

1. 创建新的 `.env` 文件

    ```sh
    cp .env.example .env
    ```

    将你的 API 密钥粘贴到 `.env` 文件中。一个 [ReByte](#11-rebyte-api-key) 或 [OpenAI](#12-optional-openai-api-token) API 密钥足以开始使用。

    你也可以配置其他 API 密钥（如果有的话）。

1. 使用 `docker-compose.yaml` 启动应用

    ```sh
    docker compose up
    ```

    如果你在使用 Docker 时遇到问题（尤其是在非 Linux 机器上），请参考 https://docs.docker.com/get-docker/（安装）和 https://docs.docker.com/desktop/troubleshoot/overview/（故障排除）。

1. 打开 http://localhost:3000 享受应用！

## 💿 开发者 - 使用 Python 安装

- **步骤 1**. 克隆代码库
  ```sh
  git clone https://github.com/Shaunwei/FunnyChar.git && cd FunnyChar
  ```
- **步骤 2**. 安装依赖

  安装 [portaudio](https://people.csail.mit.edu/hubert/pyaudio/) 和 [ffmpeg](https://ffmpeg.org/download.html) 以支持音频

  ```sh
  # 对于 mac
  brew install portaudio
  brew install ffmpeg
  ```

  ```sh
  # 对于 ubuntu
  sudo apt update
  sudo apt install portaudio19-dev
  sudo apt install ffmpeg
  ```

  注意：

  - `ffmpeg>=4.4` 需要与 `torchaudio>=2.1.0` 一起使用

  - mac 用户可能需要将 ffmpeg 库路径添加到 `DYLD_LIBRARY_PATH` 以使 torchaudio 正常工作：
    ```sh
    export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH
    ```

  然后安装所有 Python 依赖

  ```
  conda create --name realchar python=3.11
  conda activate realchar
  ```

  ```sh
  pip install -r requirements.txt
  ```

  如果需要更快的本地语音转文本，安装 whisperX

  ```sh
  pip install git+https://github.com/m-bain/whisperx.git
  ```

- **步骤 3**. 如果以前没有创建过 SQLite 数据库，请创建一个空数据库
  ```sh
  sqlite3 test.db "VACUUM;"
  ```
- **步骤 4**. 运行数据库升级
  ```sh
  alembic upgrade head
  ```
  这确保你的数据库模式是最新的。每次从主分支拉取后，请运行此命令。
- **步骤 5**. 设置 `.env` 文件：
  ```sh
  cp .env.example .env
  ```
  按照 `.env` 文件中的说明更新 API 密钥和配置。
  > 注意，某些功能需要工作中的登录系统。如果需要，你可以通过 [Firebase](https://firebase.google.com/) 免费获取自己的 OAuth2 登录。要启用，请将 `USE_AUTH` 设置为 `true` 并填写 `FIREBASE_CONFIG_PATH` 字段。还需填写 Firebase 配置到 `client/next-web/.env` 文件中。
- **步骤 6**. 使用 `cli.py` 启动后台服务器，或直接使用 uvicorn
  ```sh
  python cli.py run-uvicorn
  # 或
  uvicorn characters.main:app
  ```
- **步骤 7**. 启动前端客户端：

  - 网页客户端：

    在 `client/next-web/` 目录下创建 `.env` 文件

    ```sh
    cp client/next-web/.env.example client/next-web/.env
    ```

    根据 `client/next-web/README.md` 中的说明调整 `.env` 文件。

    启动前端服务器：

    ```sh
    python cli.py next-web-dev
    # 或
    cd client/next-web && npm run dev
    # 或
    cd client/next-web && npm run build && npm run start
    ```

    执行这些命令后，本地开发服务器将启动，默认网页浏览器将打开一个新的标签页/窗口指向该服务器（通常是 http://localhost:3000）。

  - （可选）终端客户端：

    在终端中运行以下命令

    ```sh
    python client/cli.py
    ```

  - （可选）移动客户端：

    在 Xcode 中打开 `client/mobile/ios/rac/rac.xcodeproj/project.pbxproj` 并运行应用

- **步骤 8**. 选择一个角色开始对话。使用 **GPT4** 以获得更好的对话体验，并 **佩戴耳机** 以获得最佳音频效果（避免回音）

如果你想远程连接到 FunnyChar 服务器，需要设置 SSL 以建立音频连接。

## 👨‍🚀 API 密钥和配置

### 1. LLMs

步骤如下：

1. 访问 [OpenAI 的平台](https://platform.openai.com/) 并注册一个账户（如果尚未注册）。
2. 登录后，进入设置 > API 密钥。
3. 通过点击“创建新密钥”按钮生成新的 API 密钥。
4. 将密钥复制到 `.env` 文件的 `OPENAI_API_KEY` 变量中。

有关 OpenAI API 的更多信息，请参见其 [API 文档](https://platform.openai.com/docs/guides/gpt)。
</details>

### 2. 语音

### 2.1 Google Speech to Text API 密钥

获取你的 Google Cloud Speech-to-Text API 密钥，请按照以下步骤：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/) 并注册一个账户（如果尚未注册）。
2. 创建一个新项目。
3. 在“API 和服务”中启用 “Speech-to-Text” API。
4. 生成服务账户密钥并下载 JSON 文件。
5. 将 JSON 文件路径复制到 `.env` 文件中的 `GOOGLE_APPLICATION_CREDENTIALS` 变量中。

有关 Google Speech-to-Text 的更多信息，请参见其 [API 文档](https://cloud.google.com/speech-to-text/docs/overview) 。

### 2.2 ElevenLabs API 密钥

获取你的 ElevenLabs API 密钥，请按照以下步骤：

1. 访问 [ElevenLabs 网站](https://beta.elevenlabs.io/) 并注册一个账户（如果尚未注册）。
2. 登录后，进入设置 > API 密钥。
3. 生成新的 API 密钥。
4. 将密钥复制到 `.env` 文件中的 `ELEVEN_API_KEY` 变量中。

有关 ElevenLabs API 的更多信息，请参见其 [API 文档](https://docs.elevenlabs.io/)。

### 3. Firebase 密钥

获取你的 Firebase 配置文件：

1. 访问 [Firebase 控制台](https://console.firebase.google.com/) 并创建一个新的 Firebase 项目。
2. 在项目设置中，找到 Firebase 配置文件的下载链接。
3. 将下载的配置文件路径复制到 `.env` 文件中的 `FIREBASE_CONFIG_PATH` 变量中。

有关 Firebase 的更多信息，请参见其 [文档](https://firebase.google.com/docs/web/setup)。

## 👩‍💻 贡献

1. **Fork** 该仓库并 **克隆** 到本地
2. **创建新的分支** 并进行更改
3. 提交更改并 **推送** 到 GitHub
4. 提交 **Pull Request** 来审查更改

## 📜 许可

FunnyChar 遵循 MIT 许可证。有关详细信息，请参见 `LICENSE` 文件。