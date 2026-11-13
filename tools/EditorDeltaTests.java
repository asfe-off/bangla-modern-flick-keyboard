import dev.banglaflick.test.EditorDelta;
public final class EditorDeltaTests {
    static int count=0;
    static void check(String old,int start,int end,String next){
        EditorDelta d=EditorDelta.between(old,start,end,next);
        String result=old.substring(0,start-d.beforeDelete)+d.replacement+old.substring(end+d.afterDelete);
        if(!result.equals(next))throw new AssertionError("Incorrect InputConnection edit");
        if(d.beforeDelete<0||d.afterDelete<0)throw new AssertionError("Negative delete");count++;
    }
    public static void main(String[] args){
        check("",0,0,"ক");check("ক",1,1,"ক্");check("ক্",2,2,"ক্ত");
        check("ক্ত",3,3,"ক্তা");check("ক্তা",4,4,"");check("ক্",2,2,"কা");
        check("গ",1,1,"খ");check("খ",1,1,"ক");check("কা",2,2,"ক");
        check("কত",1,1,"ক্ত");check("hello world",6,11,"hello বাংলা");
        check("cry",3,3,"cry😭");check("x😀y",3,3,"xy");check("x👍🏽y",5,5,"xy");
        check("aaaa",1,1,"aaaaa");check("aaaa",1,3,"aaa");
        check("আমা",3,3,"আমার ");check("abc def",3,3,"abc\ndef");
        String[] alphabet={"ক","আ","্","ষ"," ","😀","া","x"};
        java.util.Random random=new java.util.Random(21);
        for(int i=0;i<5000;i++){
            StringBuilder text=new StringBuilder();for(int j=0;j<random.nextInt(20);j++)text.append(alphabet[random.nextInt(alphabet.length)]);
            String old=text.toString();int a=random.nextInt(old.length()+1),b=a+random.nextInt(old.length()-a+1);
            // Only editor selection positions that do not split surrogate pairs.
            if(a>0&&a<old.length()&&Character.isLowSurrogate(old.charAt(a)))a--;
            if(b>0&&b<old.length()&&Character.isLowSurrogate(old.charAt(b)))b++;
            String next=old.substring(0,a)+alphabet[random.nextInt(alphabet.length)]+old.substring(b);check(old,a,b,next);
        }
        System.out.println("PASS: "+count+" host editor delta cases, including Bangla, conjuncts, emoji, selections and Undo.");
    }
}
