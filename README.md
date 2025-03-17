# LocalSpeech

LocalSpeech is a project that sets up and runs AI-powered speech models with just one command. All voice models are setup in openai client sdk format. This guide provides step-by-step instructions to install all dependencies, set up the environment, and run both backend and playground services.

## Prerequisites
Ensure you have the following installed before proceeding:

### 1. Install Homebrew (macOS only)
If you are using macOS and don't have Homebrew installed, run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Conda
Miniconda (recommended for lightweight installation):
```bash
curl -fsSL https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh | bash
```
Restart your terminal and initialize Conda:
```bash
conda init zsh
```

For Linux users, replace `MacOSX-x86_64` with `Linux-x86_64` in the download link.

### 3. Install Node.js and npm
You can install Node.js and npm via Homebrew (macOS) or a package manager:
```bash
brew install node
```
For Linux:
```bash
sudo apt install nodejs npm -y
```

### 4. Install ffmpeg
```bash
brew install ffmpeg  # macOS
sudo apt install ffmpeg -y  # Linux
```

## Running LocalSpeech

### 1. Running the Backend
To set up and run a speech model backend, execute the following command:
```zsh
chmod+x master-script.sh
./master-script.sh
```
This script:
- Prompts you to select a model.
- Clones the corresponding repository.
- Creates and activates a Conda environment.
- Installs dependencies.
- Starts the model API server in an openai compliant format

### 2. Running the playground
To set up and run the playground service, execute:
```zsh
chmod +x run-frontend.sh
./run-frontend.sh
```
This script:
- Navigates to the `frontend` directory.
- Installs dependencies using `npm install`.
- Starts the development server using `npm run dev`.

## Supported models
- Whisper Speech Recognition
- Kokoro TTS
- Spark TTS
- Zonos TTS

## Additional Notes
- If the backend folder exists but the Conda environment does not, the script will delete the folder and re-clone it.
- Make sure to activate the Conda environment before running the backend manually:
  ```bash
  conda activate <env_name>
  ```
- If you encounter permission issues, try running the scripts with `chmod +x script_name.sh` and then executing them.
- Implement the APIs in your own apps by referring the `./frontend/app/page.tsx` page to get idea about the api.

## Troubleshooting
- **Conda command not found**: Restart your terminal and run `conda init zsh` again.
- **ffmpeg missing**: Ensure it's installed with `brew install ffmpeg` or `sudo apt install ffmpeg -y`.
- **Port conflicts**: If the backend or frontend fails to start, ensure no other service is running on the same port.

---
This README provides all necessary steps to get LocalSpeech up and running. If you encounter any issues, feel free to report them!

