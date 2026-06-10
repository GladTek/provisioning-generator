package org.community.provisioninggenerator.util;

/**
 * Validates ZIP entry names against path-traversal / zip-slip attacks.
 *
 * <p>Entry names are derived from JCR node names which are ultimately
 * influenced by externally installed modules, so they are treated as
 * untrusted input at this trust boundary. Only flat, relative names are
 * accepted; any name containing path separators, parent references
 * ({@code ..}) or a leading separator is rejected.
 */
public final class EntryNameSanitizer {

    private static final String PARENT_REF = "..";
    private static final String FORWARD_SLASH = "/";
    private static final String BACKSLASH = "\\";

    private EntryNameSanitizer() {
    }

    /**
     * Returns the entry name when it is a safe, flat relative name; otherwise {@code null}.
     *
     * @param name the candidate ZIP entry name (may be {@code null})
     * @return the validated name, or {@code null} if it is empty or unsafe
     */
    public static String sanitize(String name) {
        if (name == null || name.isEmpty()) {
            return null;
        }
        if (name.contains(PARENT_REF)
                || name.contains(FORWARD_SLASH)
                || name.contains(BACKSLASH)
                || name.startsWith(FORWARD_SLASH)) {
            return null;
        }
        return name;
    }
}
