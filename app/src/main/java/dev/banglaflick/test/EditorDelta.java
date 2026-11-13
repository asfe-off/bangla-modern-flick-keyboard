package dev.banglaflick.test;

/** Pure UTF-16 edit calculation, matching Android InputConnection offsets. */
public final class EditorDelta {
    public final int beforeDelete, afterDelete, replacementStart;
    public final String replacement;
    private EditorDelta(int before,int after,int start,String value) { beforeDelete=before;afterDelete=after;replacementStart=start;replacement=value; }
    public static EditorDelta between(String oldText,int selectionStart,int selectionEnd,String nextText) {
        if(selectionStart<0||selectionEnd<selectionStart||selectionEnd>oldText.length()) throw new IllegalArgumentException("Invalid selection");
        int prefix=0,max=Math.min(oldText.length(),nextText.length());
        while(prefix<max&&oldText.charAt(prefix)==nextText.charAt(prefix))prefix++;
        prefix=Math.min(prefix,selectionStart);
        // Never cut the leading half of an unchanged supplementary character.
        if(prefix>0&&prefix<oldText.length()&&Character.isLowSurrogate(oldText.charAt(prefix)))prefix--;
        int suffix=0;
        while(suffix<oldText.length()-prefix&&suffix<nextText.length()-prefix&&oldText.charAt(oldText.length()-1-suffix)==nextText.charAt(nextText.length()-1-suffix))suffix++;
        suffix=Math.min(suffix,oldText.length()-selectionEnd);
        if(suffix>0&&suffix<oldText.length()&&Character.isLowSurrogate(oldText.charAt(oldText.length()-suffix)))suffix--;
        int oldEnd=oldText.length()-suffix,newEnd=nextText.length()-suffix;
        return new EditorDelta(selectionStart-prefix,oldEnd-selectionEnd,prefix,nextText.substring(prefix,newEnd));
    }
}
