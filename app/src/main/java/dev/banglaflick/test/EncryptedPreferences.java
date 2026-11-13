package dev.banglaflick.test;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** AES-GCM ciphertext in app-private preferences; the AES key stays in Android Keystore. */
public final class EncryptedPreferences {
    private static final String ALIAS="bangla-modern-flick-preferences-v1";
    private final SharedPreferences store;
    public EncryptedPreferences(Context context){store=context.getSharedPreferences("encrypted_keyboard_preferences",Context.MODE_PRIVATE);}
    private SecretKey key() throws Exception {
        KeyStore keystore=KeyStore.getInstance("AndroidKeyStore");keystore.load(null);
        if(keystore.containsAlias(ALIAS))return (SecretKey)keystore.getKey(ALIAS,null);
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }
    public synchronized String load() throws Exception {
        String encoded=store.getString("sealed_v1",null);if(encoded==null)return "";
        if(encoded.length()>22000)throw new IllegalArgumentException("Encrypted preferences too large");
        byte[] plaintext=PreferenceCipher.decrypt(key(),Base64.decode(encoded,Base64.NO_WRAP));
        return new String(plaintext,StandardCharsets.UTF_8);
    }
    public synchronized boolean save(String json) throws Exception {
        if(json==null||json.getBytes(StandardCharsets.UTF_8).length>16384)return false;
        JSONObject parsed=new JSONObject(json);JSONObject data=parsed.optJSONObject("privateContent");
        if(data==null||data.optInt("version")!=2)return false;
        // Restrict storage to the keyboard's preference schema, not arbitrary editor text.
        java.util.Set<String> allowed=new java.util.HashSet<>(java.util.Arrays.asList("version","favorites","recent","suggestions","height","preferences","personalWords","learnedPairs"));
        java.util.Iterator<String> names=data.keys();while(names.hasNext())if(!allowed.contains(names.next()))return false;
        JSONObject clean=new JSONObject();clean.put("privateContent",data);
        byte[] envelope=PreferenceCipher.encrypt(key(),clean.toString().getBytes(StandardCharsets.UTF_8));
        return store.edit().putString("sealed_v1",Base64.encodeToString(envelope,Base64.NO_WRAP)).commit();
    }
}
