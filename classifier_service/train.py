"""
train.py — Script to train a custom tone classifier using sentence-transformers + sklearn.

Usage:
  python train.py --data training_data.csv --output ./trained_model/

CSV format:
  text,tone
  "Hey what's up?",casual
  "Dear Sir, I'd like to inquire...",formal
  ...
"""

import argparse
import os
import pandas as pd
import numpy as np
import joblib
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report


# Default sample training data (for bootstrapping)
SAMPLE_DATA = [
    # formal
    ("Dear Sir/Madam, I would like to schedule a meeting.", "formal"),
    ("Please find attached the requested documents.", "formal"),
    ("I am writing to formally request your assistance.", "formal"),
    ("Could you kindly provide the quarterly report?", "formal"),
    ("I appreciate your prompt attention to this matter.", "formal"),
    ("With regards to our previous correspondence.", "formal"),
    # casual
    ("Hey, what's up?", "casual"),
    ("Wanna grab lunch later?", "casual"),
    ("Yo, did you see that game last night?", "casual"),
    ("Lol that was so funny!", "casual"),
    ("Sure thing, catch ya later!", "casual"),
    ("Haha no way! That's crazy", "casual"),
    # neutral
    ("What time does the store close?", "neutral"),
    ("Can you send me the file?", "neutral"),
    ("The meeting is at 3 PM.", "neutral"),
    ("I'll check and get back to you.", "neutral"),
    ("Thanks for letting me know.", "neutral"),
    ("Okay, noted.", "neutral"),
    # romantic
    ("I can't stop thinking about you.", "romantic"),
    ("You make my heart skip a beat.", "romantic"),
    ("I miss you so much, darling.", "romantic"),
    ("Every moment with you is special.", "romantic"),
    ("You're the best thing in my life.", "romantic"),
    ("I love waking up next to you.", "romantic"),
    # flirt
    ("You look amazing today ;)", "flirt"),
    ("Is it hot in here or is it just you?", "flirt"),
    ("You always make me smile 😉", "flirt"),
    ("Are you a magician? Because you made everyone disappear.", "flirt"),
    ("I bet you can't guess what I'm thinking about 😏", "flirt"),
    ("You're cute when you're focused.", "flirt"),
    # angry
    ("This is absolutely ridiculous!", "angry"),
    ("I've had enough of this nonsense!", "angry"),
    ("Why does nothing ever work properly?!", "angry"),
    ("I'm so frustrated with this situation.", "angry"),
    ("This is unacceptable and I demand an explanation!", "angry"),
    ("Stop wasting my time!", "angry"),
    # sarcastic
    ("Oh sure, because that went SO well last time.", "sarcastic"),
    ("Wow, what a surprise. Not.", "sarcastic"),
    ("Yeah right, like that's gonna happen.", "sarcastic"),
    ("Oh you're a real genius, aren't you?", "sarcastic"),
    ("Thanks for nothing, really appreciate it.", "sarcastic"),
    ("Great job breaking everything.", "sarcastic"),
    # professional
    ("I'd like to discuss the project timeline.", "professional"),
    ("Please review the attached proposal.", "professional"),
    ("Let's schedule a follow-up meeting.", "professional"),
    ("The deliverables are on track for Q3.", "professional"),
    ("I'll prepare the presentation by Friday.", "professional"),
    ("Could we align on the project scope?", "professional"),
    # apologetic
    ("I'm really sorry about that.", "apologetic"),
    ("My sincere apologies for the inconvenience.", "apologetic"),
    ("I didn't mean to cause any trouble.", "apologetic"),
    ("Please forgive me, it won't happen again.", "apologetic"),
    ("I take full responsibility for the mistake.", "apologetic"),
    ("I'm so sorry, I completely forgot.", "apologetic"),
    # urgent
    ("This needs to be done ASAP!", "urgent"),
    ("Emergency! Please respond immediately.", "urgent"),
    ("Critical issue — needs immediate attention.", "urgent"),
    ("Time-sensitive: deadline is tomorrow!", "urgent"),
    ("Can you handle this right away?", "urgent"),
    ("Urgent: system is down, need help now!", "urgent"),
]


def create_sample_csv(output_path: str) -> str:
    """Create a sample training CSV from built-in data."""
    csv_path = os.path.join(output_path, "sample_training_data.csv")
    df = pd.DataFrame(SAMPLE_DATA, columns=["text", "tone"])
    df.to_csv(csv_path, index=False)
    print(f"[Train] 📝 Created sample training data at {csv_path}")
    return csv_path


def train_classifier(csv_path: str, output_dir: str) -> None:
    """Train the classifier and save the model."""
    print(f"[Train] 📂 Loading training data from {csv_path}")
    df = pd.read_csv(csv_path)
    texts = df["text"].tolist()
    labels = df["tone"].tolist()

    print(f"[Train] 📊 Dataset: {len(texts)} samples, {len(set(labels))} classes")
    print(f"[Train] Classes: {sorted(set(labels))}")

    # Encode with sentence-transformers
    print("[Train] 🔄 Encoding texts with sentence-transformers...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedder.encode(texts, show_progress_bar=True)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        embeddings, labels, test_size=0.2, random_state=42, stratify=labels
    )

    # Train logistic regression
    print("[Train] 🏋️ Training LogisticRegression...")
    clf = LogisticRegression(max_iter=1000, multi_class="multinomial", random_state=42)
    clf.fit(X_train, y_train)

    # Evaluate
    y_pred = clf.predict(X_test)
    print("\n[Train] 📈 Classification Report:")
    print(classification_report(y_test, y_pred))

    # Cross-validation
    scores = cross_val_score(clf, embeddings, labels, cv=min(5, len(set(labels))), scoring="accuracy")
    print(f"[Train] 🎯 Cross-val accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")

    # Save model
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "classifier.joblib")
    joblib.dump(clf, model_path)
    print(f"\n[Train] ✅ Model saved to {model_path}")
    print(f"[Train] To use: set CLASSIFIER_MODE=trained and TRAINED_MODEL_PATH={model_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train tone classifier")
    parser.add_argument("--data", type=str, default=None, help="Path to CSV training data")
    parser.add_argument("--output", type=str, default="./trained_model", help="Output directory for model")
    parser.add_argument("--generate-sample", action="store_true", help="Generate sample training CSV")
    args = parser.parse_args()

    if args.generate_sample:
        csv_path = create_sample_csv(args.output)
        train_classifier(csv_path, args.output)
    elif args.data:
        train_classifier(args.data, args.output)
    else:
        print("Usage: python train.py --data training_data.csv --output ./trained_model/")
        print("   Or: python train.py --generate-sample --output ./trained_model/")
