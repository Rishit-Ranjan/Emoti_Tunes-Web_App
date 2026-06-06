import argparse
import os
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models


def build_image_model(input_shape, num_classes):
    model = models.Sequential(
        [
            layers.Input(shape=input_shape),
            layers.Rescaling(1.0 / 255),
            layers.Conv2D(32, 3, activation="relu"),
            layers.MaxPooling2D(),
            layers.Conv2D(64, 3, activation="relu"),
            layers.MaxPooling2D(),
            layers.Conv2D(128, 3, activation="relu"),
            layers.MaxPooling2D(),
            layers.Flatten(),
            layers.Dropout(0.4),
            layers.Dense(128, activation="relu"),
            layers.Dense(num_classes, activation="softmax"),
        ]
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0005),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def _parse_pixels(pixels_str):
    # FER2013 pixels is 48*48 values (space-separated)
    arr = np.fromstring(pixels_str, sep=" ", dtype=np.float32)
    if arr.size != 48 * 48:
        raise ValueError(f"Unexpected pixels length: {arr.size}, expected {48*48}")
    return arr.reshape(48, 48)


def load_fer2013_csv(csv_path):
    df = pd.read_csv(csv_path)

    # Expect columns: emotion, pixels, Usage
    if not {"emotion", "pixels", "Usage"}.issubset(df.columns):
        raise ValueError(
            "FER2013 CSV must contain columns: emotion, pixels, Usage. "
            f"Found columns: {list(df.columns)}"
        )

    # Map emotion to int labels directly (already 0-6)
    y = df["emotion"].astype(np.int32).to_numpy()

    # Build X as (N, 48, 48, 3)
    X_48x48 = np.stack([_parse_pixels(s) for s in df["pixels"].astype(str).to_numpy()], axis=0)
    X_48x48 = X_48x48.astype(np.float32)

    # Convert to 3 channels for the CNN
    X = np.repeat(X_48x48[..., np.newaxis], 3, axis=-1)
    return X, y, df["Usage"].astype(str).to_numpy()


def main(args):
    # We support two modes:
    # 1) If data-dir/fer2013.csv exists, train from the CSV.
    # 2) Otherwise, keep a clearer error than the original subfolder-based approach.
    csv_path = os.path.join(args.data_dir, "fer2013.csv")
    if not os.path.isfile(csv_path):
        raise ValueError(
            "No images found via directory subfolders, and fer2013.csv was not found. "
            f"Expected CSV at: {csv_path}"
        )

    print(f"Loading FER2013 CSV: {csv_path}")
    X, y, usage = load_fer2013_csv(csv_path)

    # Split based on Usage column when present
    train_mask = usage == "Training"
    val_mask = usage == "PublicTest" if np.any(usage == "PublicTest") else usage == "PrivateTest"

    if np.any(val_mask):
        X_train, y_train = X[train_mask], y[train_mask]
        X_val, y_val = X[val_mask], y[val_mask]
    else:
        # Fallback: random split
        n = len(X)
        rng = np.random.default_rng(args.seed)
        idx = np.arange(n)
        rng.shuffle(idx)
        split = int(n * (1.0 - args.validation_split))
        train_idx, val_idx = idx[:split], idx[split:]
        X_train, y_train = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]

    # Resize from 48x48 to img_size if needed
    if args.img_size != 48:
        X_train = tf.image.resize(X_train, (args.img_size, args.img_size)).numpy()
        X_val = tf.image.resize(X_val, (args.img_size, args.img_size)).numpy()

    class_names = ["0", "1", "2", "3", "4", "5", "6"]
    num_classes = len(class_names)

    print(f"Train samples: {len(X_train)}, val samples: {len(X_val)}")

    model = build_image_model((args.img_size, args.img_size, 3), num_classes)
    model.summary()

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        verbose=2,
    )

    os.makedirs(os.path.dirname(args.output_model), exist_ok=True)
    model.save(args.output_model)
    print(f"Model saved to {args.output_model}")

    label_path = os.path.join(os.path.dirname(args.output_model), "image_label_classes.npy")
    np.save(label_path, np.array(class_names))
    print(f"Label classes saved to {label_path}")

    if args.export_tfjs:
        tfjs_dir = args.export_tfjs
        print(f"Exporting TensorFlow.js model to {tfjs_dir}...")
        try:
            from tensorflowjs.converters import save_keras_model

            os.makedirs(tfjs_dir, exist_ok=True)
            save_keras_model(model, tfjs_dir)
            print(f"TF.js model exported to {tfjs_dir}")
        except ImportError:
            print(
                "tensorflowjs is not installed. Install it with `pip install tensorflowjs` "
                "to export TF.js models."
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train an image emotion recognition model (FER2013 CSV).")
    parser.add_argument(
        "--data-dir",
        required=True,
        help="Path to FER2013 directory containing fer2013.csv",
    )
    parser.add_argument(
        "--output-model",
        default="backend/models/image_emotion_model.h5",
        help="Output Keras model path",
    )
    parser.add_argument("--img-size", type=int, default=128, help="Image size to use for training")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--epochs", type=int, default=20, help="Number of training epochs")
    parser.add_argument(
        "--validation-split",
        type=float,
        default=0.2,
        help="Fallback validation split fraction (used only if Usage-based split isn’t available)",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for split")
    parser.add_argument("--export-tfjs", default="", help="Directory path to export a TF.js model")
    args = parser.parse_args()
    main(args)

