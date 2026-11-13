import dev.banglaflick.test.PreferenceCipher;
import java.util.Arrays;
import java.nio.charset.StandardCharsets;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

public final class PreferenceCipherTests {
    static int count=0;
    static void rejects(SecretKey key,byte[] data) throws Exception {
        boolean rejected=false;try{PreferenceCipher.decrypt(key,data);}catch(Exception expected){rejected=true;}
        if(!rejected)throw new AssertionError("Accepted corrupt ciphertext");count++;
    }
    public static void main(String[] args) throws Exception {
        KeyGenerator generator=KeyGenerator.getInstance("AES");generator.init(256);SecretKey key=generator.generateKey();
        byte[] original="বাংলা favorites 😀 and learned words".getBytes(StandardCharsets.UTF_8);
        byte[] sealed=PreferenceCipher.encrypt(key,original);
        if(!Arrays.equals(original,PreferenceCipher.decrypt(key,sealed)))throw new AssertionError("Round trip failed");count++;
        if(Arrays.equals(sealed,PreferenceCipher.encrypt(key,original)))throw new AssertionError("Repeated encryption reused IV");count++;
        for(int i=0;i<sealed.length;i++){byte[] tampered=sealed.clone();tampered[i]^=1;rejects(key,tampered);}
        for(int i=0;i<sealed.length;i++)rejects(key,Arrays.copyOf(sealed,i));
        rejects(generator.generateKey(),sealed);rejects(key,new byte[16414]);
        for(int length:new int[]{0,1,1024,16384}){
            byte[] payload=new byte[length];new java.security.SecureRandom().nextBytes(payload);
            if(!Arrays.equals(payload,PreferenceCipher.decrypt(key,PreferenceCipher.encrypt(key,payload))))throw new AssertionError("Size boundary failed");count++;
        }
        boolean rejected=false;try{PreferenceCipher.encrypt(key,new byte[16385]);}catch(IllegalArgumentException expected){rejected=true;}
        if(!rejected)throw new AssertionError("Oversized input accepted");count++;
        System.out.println("PASS: "+count+" authenticated encryption checks (JVM provider; Android Keystore device test still required).");
    }
}
