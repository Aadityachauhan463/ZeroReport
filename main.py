from pyngrok import ngrok
ngrok.set_auth_token("335kJlJo1XesjvEwn8dhl8HTPCg_4B8Vffr2FZT6guDGy4Cb9")
public_url = ngrok.connect(9005)
print(public_url)