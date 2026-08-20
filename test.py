from main import extraer_fragmento
import traceback

def test_video(vid):
    print(f"\nTesting {vid}...")
    try:
        res = extraer_fragmento(f"https://www.youtube.com/watch?v={vid}", 0, 60)
        print("Success! Length of text:", len(res))
        print("Preview:", res[:100])
    except Exception as e:
        print("Failed:", e)

test_video("cKNalMQxhjw")
test_video("bZEAnSZKwIs")
