#!/usr/bin/env zsh

# Prompt user for model selection
echo "Select a model to run:"
select MODEL in "kokoro" "zonos" "whisper" "spark" "sesame" ; do
    if [[ -n "$MODEL" ]]; then
        break
    else
        echo "Invalid selection. Try again."
    fi
done

# Install ffmpeg if not installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing ffmpeg..."
    brew install ffmpeg
else
    echo "ffmpeg is already installed."
fi

# Set repository and environment based on selection
if [[ "$MODEL" == "kokoro" ]]; then
    REPO="https://github.com/Ilikepizza2/kokoro-openai.git"
    ENV_NAME="kokoro"
    DEPENDENCIES="pip install -r requirements.txt"

elif [[ "$MODEL" == "zonos" ]]; then
    REPO="https://github.com/Ilikepizza2/zonos-openai.git"
    ENV_NAME="zonos"
    DEPENDENCIES="pip install -e ."

elif [[ "$MODEL" == "whisper" ]]; then
    REPO="https://github.com/Ilikepizza2/whisper-openai.git"
    ENV_NAME="whisper"
    DEPENDENCIES="pip install -r requirements.txt"

elif [[ "$MODEL" == "spark" ]]; then
    REPO="https://github.com/Ilikepizza2/sparktts-openai.git"
    ENV_NAME="spark"
    DEPENDENCIES="pip install -r requirements.txt && git lfs install && git clone https://huggingface.co/SparkAudio/Spark-TTS-0.5B pretrained_models/Spark-TTS-0.5B"

elif [[ "$MODEL" == "sesame" ]]; then
    REPO="https://github.com/Ilikepizza2/sesame-openai.git/"
    ENV_NAME="sesame"
    DEPENDENCIES="pip install git+https://github.com/senstella/csm-mlx && pip install -r requirements.txt"

else
    echo "Invalid selection."
    exit 1
fi

# Check if Conda environment exists
if conda env list | grep -q "^$ENV_NAME "; then
    echo "Conda environment $ENV_NAME already exists. Activating..."
    cd "$MODEL" || exit
    source activate "$ENV_NAME" || conda activate "$ENV_NAME"
else
    # Check if model folder exists and is not empty
    if [[ -d "$MODEL" && ! -z "$(ls -A "$MODEL" 2>/dev/null)" ]]; then
        echo "Model folder exists but environment does not. Deleting folder..."
        rm -rf "$MODEL"
    fi
    
    # Clone repository
    echo "Cloning repository for $MODEL..."
    git clone "$REPO" "$MODEL"
    cd "$MODEL" || exit

    # Set up Conda environment
    echo "Setting up Conda environment..."
    conda create -y -n "$ENV_NAME" python="3.10"
    source activate "$ENV_NAME" || conda activate "$ENV_NAME"

    # Install dependencies
    echo "Installing dependencies..."
    eval "$DEPENDENCIES"
fi

# Start the model server
echo "Starting $MODEL server..."
python api-server.py
