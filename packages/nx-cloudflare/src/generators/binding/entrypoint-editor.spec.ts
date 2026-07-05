import { describe, it, expect } from 'bun:test';
import {
  addQueueHandler,
  type AddQueueHandlerOutcome,
} from './entrypoint-editor';

const METHOD = `  async queue(batch: MessageBatch<unknown>, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      // TODO: process message
      message.ack();
    }
  },`;

function insertedSource(outcome: AddQueueHandlerOutcome): string {
  expect(outcome.status).toBe('inserted');
  return (outcome as Extract<AddQueueHandlerOutcome, { status: 'inserted' }>)
    .source;
}

describe('addQueueHandler', () => {
  it('inserts the method into a default export with existing methods, before the closing brace', () => {
    const source = `export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Hello!');
  },
};
`;
    const out = insertedSource(addQueueHandler(source, METHOD));

    // Existing handler survives and the new method lands inside the object.
    expect(out).toContain('async fetch');
    expect(out).toContain('async queue(');
    expect(out.indexOf('async queue(')).toBeGreaterThan(
      out.indexOf('async fetch')
    );
    expect(out.indexOf('async queue(')).toBeLessThan(out.lastIndexOf('}'));
  });

  it('creates a fresh entrypoint when the source is empty', () => {
    const out = insertedSource(addQueueHandler('', METHOD));

    expect(out).toBe(`export default {
${METHOD}
};
`);
  });

  it('skips when a queue handler already exists', () => {
    const source = `export default {
  async queue(batch: MessageBatch<unknown>): Promise<void> {},
};
`;
    expect(addQueueHandler(source, METHOD)).toEqual({
      status: 'already-present',
    });
  });

  it('reports no-default-export for a class-style entrypoint', () => {
    const source = `import { WorkerEntrypoint } from 'cloudflare:workers';

export default class extends WorkerEntrypoint<Env> {
  async fetch(): Promise<Response> {
    return new Response('ok');
  }
}
`;
    expect(addQueueHandler(source, METHOD)).toEqual({
      status: 'no-default-export',
    });
  });

  it('reports no-closing-brace when the default export never closes', () => {
    const source = `export default {
  async fetch(): Promise<Response> {
    return new Response('ok');
  },
`;
    expect(addQueueHandler(source, METHOD)).toEqual({
      status: 'no-closing-brace',
    });
  });

  it('is not fooled by a "}" inside a string literal', () => {
    const source = `export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('}{ tricky }');
  },
};
`;
    const out = insertedSource(addQueueHandler(source, METHOD));

    expect(out).toContain("return new Response('}{ tricky }');");
    expect(out).toContain('async queue(');
    expect(out.indexOf('async queue(')).toBeLessThan(out.lastIndexOf('}'));
  });

  // The brace matcher skips `}` inside line comments, block comments, and
  // template literals. If any branch regressed, the matcher would either stop
  // early (method landing outside the object) or fail to find the brace.
  it.each([
    {
      label: 'line comment',
      body: `    // a stray brace } in a comment\n    return new Response('ok');`,
      token: '// a stray brace } in a comment',
    },
    {
      label: 'block comment',
      body: `    /* a stray brace } here */\n    return new Response('ok');`,
      token: '/* a stray brace } here */',
    },
    {
      label: 'template literal interpolation',
      body: '    return new Response(`value: ${1 + 1} }`);',
      token: 'value: ${1 + 1} }',
    },
  ])('skips a "}" inside a $label', ({ body, token }) => {
    const source = `export default {
  async fetch(request: Request, env: Env): Promise<Response> {
${body}
  },
};
`;
    const out = insertedSource(addQueueHandler(source, METHOD));

    expect(out).toContain(token);
    expect(out).toContain('async fetch');
    expect(out).toContain('async queue(');
    expect(out.indexOf('async queue(')).toBeLessThan(out.lastIndexOf('}'));
  });

  it('handles nested braces in the class body (objects and blocks inside methods)', () => {
    const source = `export default {
  async fetch(request: Request): Promise<Response> {
    const data = { a: { b: [{ c: 1 }] } };
    if (data.a) {
      return Response.json({ ok: true });
    }
    return new Response('no');
  },
};

function helper() {
  return {};
}
`;
    const out = insertedSource(addQueueHandler(source, METHOD));

    // The method must be inserted before the default export's closing brace,
    // not before helper()'s.
    expect(out.indexOf('async queue(')).toBeLessThan(
      out.indexOf('function helper')
    );
    expect(out).toContain('const data = { a: { b: [{ c: 1 }] } };');
  });

  it('inserts a newline when the object closes on the same line', () => {
    const source = `export default { async fetch() { return new Response('x'); } };\n`;
    const out = insertedSource(addQueueHandler(source, METHOD));

    expect(out).toContain('async queue(');
    // Still valid-ish structure: the method is spliced right before the final `}`.
    expect(out.trimEnd().endsWith('};')).toBe(true);
  });
});
