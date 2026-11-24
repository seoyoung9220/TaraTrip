import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from import_places import to_photos  # noqa: E402

WIX = "https://static.wixstatic.com/media/a.jpg/v1/fill/w_742,h_308,q_80/a.jpg"


def test_photos_keep_commas_inside_one_url():
    assert to_photos(WIX) == [WIX]


def test_photos_split_on_comma_or_newline_between_urls():
    assert to_photos(f"{WIX}, https://x.com/b.png\nhttps://x.com/c.jpg") == [
        WIX, "https://x.com/b.png", "https://x.com/c.jpg"]


def test_photos_empty():
    assert to_photos(None) == [] and to_photos("  ") == []


def test_photos_drop_text_that_is_not_a_url():
    assert to_photos("no direct image links available online") == []
    assert to_photos(f"see facebook, {WIX}") == [WIX]
