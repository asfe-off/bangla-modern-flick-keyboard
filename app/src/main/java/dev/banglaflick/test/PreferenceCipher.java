package dev.banglaflick.test;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Versioned authenticated encryption. Android Keystore provides the key in the app. */
public final class PreferenceCipher {
    private static final byte[] AAD="BanglaModernFlickPreferences/v1".getBytes(StandardCharsets.UTF_8);
    private PreferenceCipher(){}
    public static byte[] encrypt(SecretKey key,byte[] plaintext) throws Exception {
        if(plaintext.length>16384)throw new IllegalArgumentException("Preferences too large");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key);cipher.updateAAD(AAD);
        byte[] encrypted=cipher.doFinal(plaintext),iv=cipher.getIV();
        if(iv.length!=12)throw new IllegalStateException("Unexpected GCM IV");
        byte[] envelope=new byte[13+encrypted.length];envelope[0]=1;
        System.arraycopy(iv,0,envelope,1,12);System.arraycopy(encrypted,0,envelope,13,encrypted.length);return envelope;
    }
    public static byte[] decrypt(SecretKey key,byte[] envelope) throws Exception {
        if(envelope.length<29||envelope.length>16413||envelope[0]!=1)throw new IllegalArgumentException("Invalid encrypted preference format");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Arrays.copyOfRange(envelope,1,13)));cipher.updateAAD(AAD);
        return cipher.doFinal(envelope,13,envelope.length-13);
    }
}
