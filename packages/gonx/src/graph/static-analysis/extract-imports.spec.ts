import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { extractImports } from './extract-imports';

describe('extractImports', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gonx-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('single imports', () => {
    it('should extract single import with double quotes', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import "fmt"

func main() {
  fmt.Println("hello")
}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['fmt']);
    });

    it('should extract single import with backticks', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import \`path/filepath\`

func main() {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['path/filepath']);
    });
  });

  describe('grouped imports', () => {
    it('should extract multiple imports from import block', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import (
  "fmt"
  "strings"
  "os"
)

func main() {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['fmt', 'strings', 'os']);
    });
  });

  describe('aliased imports', () => {
    it('should extract import with alias', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import f "fmt"

func main() {
  f.Println("hello")
}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['fmt']);
    });

    it('should extract imports with multiple aliases', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import (
  f "fmt"
  s "strings"
)

func main() {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['fmt', 'strings']);
    });
  });

  describe('special imports', () => {
    it('should extract dot import', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import . "testing"

func TestMain(t *T) {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['testing']);
    });

    it('should extract blank import', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import _ "image/png"

func main() {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['image/png']);
    });
  });

  describe('cgo filtering', () => {
    it('should filter out cgo pseudo-import', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

/*
#include <stdio.h>
*/
import "C"

import "fmt"

func main() {
  fmt.Println("hello")
}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).not.toContain('C');
      expect(imports).toContain('fmt');
    });
  });

  describe('edge cases', () => {
    it('should return empty array for file without imports', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

func main() {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual([]);
    });

    it('should return empty array for empty file', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(filePath, '');

      const imports = await extractImports(filePath);

      expect(imports).toEqual([]);
    });

    it('should return empty array for non-existent file', async () => {
      const imports = await extractImports('/nonexistent/main.go');

      expect(imports).toEqual([]);
    });

    it('should handle third-party package imports', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import (
  "github.com/myorg/shared/utils"
  "github.com/external/library"
)

func main() {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual([
        'github.com/myorg/shared/utils',
        'github.com/external/library',
      ]);
    });

    it('should handle mixed standard and third-party imports', async () => {
      const filePath = join(tempDir, 'main.go');
      await writeFile(
        filePath,
        `package main

import (
  "fmt"
  "os"

  "github.com/myorg/shared"
)

func main() {}
`
      );

      const imports = await extractImports(filePath);

      expect(imports).toEqual(['fmt', 'os', 'github.com/myorg/shared']);
    });
  });
});
