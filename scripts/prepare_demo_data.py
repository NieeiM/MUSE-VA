import contextlib
import csv
import json
import math
import os
import random
import shutil
import statistics
import subprocess
import wave
from collections import Counter
from pathlib import Path


REPO_DIR = Path("/home/bingxing2/home/scx6a0j/demopage/EMO-WebDemo")
DATA_DIR = REPO_DIR / "data"
AUDIO_OUT_DIR = DATA_DIR / "audio"
IMAGE_OUT_DIR = DATA_DIR / "images"
CASES_JSON_PATH = DATA_DIR / "cases.json"

EMO_BASE = Path("/home/bingxing2/home/scx6a0j/data/music/EMO")
IMAGE_BASE = Path("/home/bingxing2/home/scx6a0j/code/MARBLE/generated_images/qwen-image-2512.visual_caption")
CSV_PATH = EMO_BASE / "stimuli_all_sampled_v2.csv"

SPLIT_TO_AUDIO_DIR = {
    "train": EMO_BASE / "train",
    "valid": EMO_BASE / "valid",
    "test": EMO_BASE / "test",
}
SPLIT_TO_IMAGE_DIR = {
    "train": IMAGE_BASE / "train",
    "valid": IMAGE_BASE / "val",
    "test": IMAGE_BASE / "test",
}

STORAGE_BUDGET_BYTES = 500 * 1024 * 1024
MP3_BITRATE_KBPS = 128
RANDOM_SEED = 42
MP3_EXTENSION = ".mp3"


def load_rows():
    rows = []
    with CSV_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for raw_row in reader:
            row = {
                (key.lstrip("\ufeff") if key else key): value
                for key, value in raw_row.items()
            }
            rows.append(row)
    return rows


def locate_audio(wav_name):
    for split, directory in SPLIT_TO_AUDIO_DIR.items():
        path = directory / wav_name
        if path.exists():
            return split, path
    return None, None


def locate_image(wav_name):
    image_name = wav_name.replace(".wav", ".png")
    for split, directory in SPLIT_TO_IMAGE_DIR.items():
        path = directory / image_name
        if path.exists():
            return split, path
    return None, None


def wav_duration_seconds(wav_path):
    with contextlib.closing(wave.open(str(wav_path), "rb")) as wav_file:
        frames = wav_file.getnframes()
        sample_rate = wav_file.getframerate()
        return frames / float(sample_rate)


def estimate_mp3_size_bytes(duration_sec):
    return int(math.ceil(duration_sec * MP3_BITRATE_KBPS * 1000 / 8))


def clean_output_dirs():
    for directory in (AUDIO_OUT_DIR, IMAGE_OUT_DIR):
        directory.mkdir(parents=True, exist_ok=True)
        for path in directory.iterdir():
            if path.is_file():
                path.unlink()


def ffmpeg_encode_to_mp3(src_wav, dst_mp3):
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-i",
        str(src_wav),
        "-codec:a",
        "libmp3lame",
        "-b:a",
        f"{MP3_BITRATE_KBPS}k",
        str(dst_mp3),
    ]
    subprocess.run(cmd, check=True)


def build_dataset_summary(all_rows):
    valences = [float(row["valence"]) for row in all_rows]
    arousals = [float(row["arousal"]) for row in all_rows]
    emotion_counts = Counter(row["emotion"] for row in all_rows)
    genre_counts = Counter(row["genre"] for row in all_rows)

    split_counts = Counter()
    for row in all_rows:
        split, _ = locate_audio(row["new_wav_path"])
        if split:
            split_counts[split] += 1

    return {
        "title": "EMO datasets WebDemo",
        "total_tracks": len(all_rows),
        "splits": {
            "train": split_counts.get("train", 0),
            "valid": split_counts.get("valid", 0),
            "test": split_counts.get("test", 0),
        },
        "emotion_count": len(emotion_counts),
        "genre_count": len(genre_counts),
        "valence": {
            "mean": round(statistics.fmean(valences), 2),
            "min": round(min(valences), 1),
            "max": round(max(valences), 1),
        },
        "arousal": {
            "mean": round(statistics.fmean(arousals), 2),
            "min": round(min(arousals), 1),
            "max": round(max(arousals), 1),
        },
        "top_emotions": [
            {"name": name, "count": count}
            for name, count in emotion_counts.most_common(10)
        ],
        "top_genres": [
            {"name": name, "count": count}
            for name, count in genre_counts.most_common(8)
        ],
        "audio_meta": {
            "sample_rate_hz": 44100,
            "channels": 2,
            "format": "wav",
        },
    }


def numeric_summary(values, digits_mean_std=2, digits_min_max=1):
    return {
        "mean": round(statistics.fmean(values), digits_mean_std),
        "std": round(statistics.pstdev(values), digits_mean_std),
        "min": round(min(values), digits_min_max),
        "max": round(max(values), digits_min_max),
    }


def build_case_entry(index, row, mp3_name, image_name, duration_sec):
    caption_zh = row.get("caption_full_zh") or row["caption_full"]
    return {
        "id": f"case-{index:03d}",
        "index": index,
        "run_id": row["run_id"],
        "music_id": row["music_id"],
        "audio_file": f"data/audio/{mp3_name}",
        "image_file": f"data/images/{image_name}",
        "genre": row["genre"],
        "lead_instruments": row["lead_instruments"],
        "supporting_instruments": row["supporting_instruments"],
        "tempo": int(float(row["tempo"])),
        "key": row["key"],
        "theme": row["theme"],
        "emotion": row["emotion"],
        "valence": float(row["valence"]),
        "arousal": float(row["arousal"]),
        "innovation": row["innovation"],
        "vocal": row["vocal"],
        "caption_full": row["caption_full"],
        "caption_tags": row["caption_tags"],
        "visual_imagery": row["visual_imagery"],
        "visual_tags": row["visual_tags"],
        "visual_caption": row["visual_caption"],
        "consistency_result": row["consistency_result"],
        "consistency_reason": row["consistency_reason"],
        "duration_sec": round(duration_sec, 2),
        "va_cell": row["va_cell"],
        "v_cell": row["v_cell"],
        "a_cell": row["a_cell"],
        "caption_full_zh": caption_zh,
    }


def main():
    random.seed(RANDOM_SEED)
    all_rows = load_rows()
    dataset_summary = build_dataset_summary(all_rows)

    valid_rows = []
    for row in all_rows:
        wav_name = row["new_wav_path"]
        _, audio_path = locate_audio(wav_name)
        _, image_path = locate_image(wav_name)
        if not audio_path or not image_path:
            continue
        duration_sec = wav_duration_seconds(audio_path)
        image_size = image_path.stat().st_size
        row = dict(row)
        row["_audio_path"] = str(audio_path)
        row["_image_path"] = str(image_path)
        row["_duration_sec"] = duration_sec
        row["_image_size"] = image_size
        row["_estimated_pair_size"] = estimate_mp3_size_bytes(duration_sec) + image_size
        valid_rows.append(row)

    if not valid_rows:
        raise RuntimeError("No valid audio-image pairs found.")

    average_pair_size = statistics.fmean(row["_estimated_pair_size"] for row in valid_rows)
    target_case_count = min(
        len(valid_rows),
        int(STORAGE_BUDGET_BYTES // average_pair_size),
    )
    if target_case_count <= 0:
        raise RuntimeError("Storage budget is too small for even one pair.")

    shuffled_rows = list(valid_rows)
    random.shuffle(shuffled_rows)

    selected_rows = shuffled_rows[:target_case_count]
    estimated_selected_size = sum(row["_estimated_pair_size"] for row in selected_rows)
    while selected_rows and estimated_selected_size > STORAGE_BUDGET_BYTES:
        removed = selected_rows.pop()
        estimated_selected_size -= removed["_estimated_pair_size"]

    if not selected_rows:
        raise RuntimeError("No sampled pairs fit within the storage budget estimate.")

    clean_output_dirs()

    converted = []
    running_size = 0
    for row in selected_rows:
        wav_name = row["new_wav_path"]
        mp3_name = wav_name.replace(".wav", MP3_EXTENSION)
        image_name = wav_name.replace(".wav", ".png")
        dst_mp3 = AUDIO_OUT_DIR / mp3_name
        dst_image = IMAGE_OUT_DIR / image_name

        ffmpeg_encode_to_mp3(Path(row["_audio_path"]), dst_mp3)
        shutil.copy2(row["_image_path"], dst_image)

        pair_size = dst_mp3.stat().st_size + dst_image.stat().st_size
        running_size += pair_size
        converted.append(
            {
                "row": row,
                "mp3_name": mp3_name,
                "image_name": image_name,
                "pair_size": pair_size,
            }
        )

    if not converted:
        raise RuntimeError("No converted pairs fit within the storage budget.")

    cases = []
    valences = []
    arousals = []
    durations = []
    genre_counts = Counter()
    emotion_counts = Counter()

    for index, item in enumerate(converted, start=1):
        row = item["row"]
        duration_sec = row["_duration_sec"]
        cases.append(
            build_case_entry(
                index=index,
                row=row,
                mp3_name=item["mp3_name"],
                image_name=item["image_name"],
                duration_sec=duration_sec,
            )
        )
        valences.append(float(row["valence"]))
        arousals.append(float(row["arousal"]))
        durations.append(duration_sec)
        genre_counts[row["genre"]] += 1
        emotion_counts[row["emotion"]] += 1

    selected_summary = {
        "num_tracks": len(cases),
        "num_emotions_covered": len(emotion_counts),
        "valence": numeric_summary(valences),
        "arousal": numeric_summary(arousals),
        "duration_sec": numeric_summary(durations, digits_mean_std=1, digits_min_max=1),
        "genre_distribution": dict(genre_counts.most_common()),
        "emotion_distribution": dict(emotion_counts.most_common()),
        "storage": {
            "budget_bytes": STORAGE_BUDGET_BYTES,
            "used_bytes": running_size,
            "budget_mb": round(STORAGE_BUDGET_BYTES / (1024 * 1024), 2),
            "used_mb": round(running_size / (1024 * 1024), 2),
            "mp3_bitrate_kbps": MP3_BITRATE_KBPS,
            "estimated_average_pair_mb": round(average_pair_size / (1024 * 1024), 3),
        },
        "tracks": [
            {
                "new_wav_path": item["row"]["new_wav_path"],
                "demo_audio_file": item["mp3_name"],
                "va_cell": item["row"]["va_cell"],
                "emotion": item["row"]["emotion"],
                "valence": float(item["row"]["valence"]),
                "arousal": float(item["row"]["arousal"]),
                "genre": item["row"]["genre"],
                "duration_sec": round(item["row"]["_duration_sec"], 2),
            }
            for item in converted
        ],
    }

    output = {
        "dataset": dataset_summary,
        "selected_summary": selected_summary,
        "cases": cases,
    }

    CASES_JSON_PATH.write_text(
        json.dumps(output, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "valid_pairs": len(valid_rows),
                "target_case_count": target_case_count,
                "sampled_case_count": len(selected_rows),
                "final_case_count": len(cases),
                "estimated_sampled_size_bytes": estimated_selected_size,
                "storage_used_bytes": running_size,
                "storage_budget_bytes": STORAGE_BUDGET_BYTES,
                "storage_used_mb": round(running_size / (1024 * 1024), 2),
                "storage_budget_mb": round(STORAGE_BUDGET_BYTES / (1024 * 1024), 2),
                "mp3_bitrate_kbps": MP3_BITRATE_KBPS,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
