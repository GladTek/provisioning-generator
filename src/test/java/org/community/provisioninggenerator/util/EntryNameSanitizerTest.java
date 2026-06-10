package org.community.provisioninggenerator.util;

import org.junit.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class EntryNameSanitizerTest {

    @Test
    public void returnsNameWhenFlatAndSafe() {
        // Arrange
        final String name = "my-module-1.0.0.jar";

        // Act
        final String result = EntryNameSanitizer.sanitize(name);

        // Assert
        assertThat(result).isEqualTo(name);
    }

    @Test
    public void returnsNullWhenNameIsNull() {
        assertThat(EntryNameSanitizer.sanitize(null)).isNull();
    }

    @Test
    public void returnsNullWhenNameIsEmpty() {
        assertThat(EntryNameSanitizer.sanitize("")).isNull();
    }

    @Test
    public void rejectsParentDirectoryReference() {
        assertThat(EntryNameSanitizer.sanitize("..")).isNull();
        assertThat(EntryNameSanitizer.sanitize("..foo")).isNull();
        assertThat(EntryNameSanitizer.sanitize("foo..bar")).isNull();
    }

    @Test
    public void rejectsForwardSlashTraversal() {
        assertThat(EntryNameSanitizer.sanitize("../../etc/passwd")).isNull();
        assertThat(EntryNameSanitizer.sanitize("dir/file.jar")).isNull();
    }

    @Test
    public void rejectsBackslashTraversal() {
        assertThat(EntryNameSanitizer.sanitize("..\\..\\windows\\system32")).isNull();
        assertThat(EntryNameSanitizer.sanitize("dir\\file.jar")).isNull();
    }

    @Test
    public void rejectsLeadingForwardSlash() {
        assertThat(EntryNameSanitizer.sanitize("/absolute.jar")).isNull();
    }

    @Test
    public void acceptsNameWithDotsThatAreNotParentRef() {
        assertThat(EntryNameSanitizer.sanitize("module.bundle.1.2.3.jar"))
                .isEqualTo("module.bundle.1.2.3.jar");
    }
}
