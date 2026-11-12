/**
 * Incremental RFC 8259 JSON syntax validator for server-side upload checks.
 * It validates the WHOLE document in constant memory, so a large glTF is never
 * accepted or rejected from a truncated prefix. It also records the minimal
 * glTF facts needed by upload validation: top-level keys and `asset.version`.
 * Dependency-free: runs unchanged under Deno (Supabase Edge) and Node.
 */
export type JsonStreamResult = {
  valid: boolean;
  error?: string;
  topLevelKeys: string[];
  assetIsObject: boolean;
  assetVersion: string | null;
};

type Mode = 'V' | 'VA' | 'K' | 'K2' | 'C' | 'AFTER' | 'STR' | 'ESC' | 'HEX' | 'NUM' | 'LIT' | 'DONE';
type Num = 'sign' | 'zero' | 'int' | 'dot' | 'frac' | 'e' | 'esign' | 'exp';

const MAX_DEPTH = 512;
const MAX_KEY = 128;

export class JsonStreamValidator {
  private mode: Mode = 'V';
  private stack: Array<'o' | 'a'> = [];
  private keys: string[] = [];
  private error: string | null = null;
  private isKey = false;
  private keyBuf = '';
  private capture = false;
  private captureBuf = '';
  private captureSimple = true;
  private hexCount = 0;
  private hexValue = 0;
  private num: Num = 'int';
  private lit = '';
  private litPos = 0;
  private decoder = new TextDecoder('utf-8', { fatal: true });
  private stringBoundary = /["\\\x00-\x1f]/g;
  private topKeys = new Set<string>();
  private assetObject = false;
  private version: string | null = null;

  /** Feed raw bytes. Invalid UTF-8 is a validation failure. */
  pushBytes(bytes: Uint8Array): boolean {
    if (this.error) return false;
    let text: string;
    try { text = this.decoder.decode(bytes, { stream: true }); }
    catch { return this.fail('invalid UTF-8'); }
    return this.pushText(text);
  }

  pushText(text: string): boolean {
    for (let i = 0; i < text.length; i += 1) {
      if (this.error) return false;
      // Large glTF buffer/data strings do not contribute to the metadata we
      // retain. Scan their ordinary spans natively, still processing every
      // quote, escape and forbidden control character through the state machine.
      if (this.mode === 'STR' && !this.isKey && !this.capture) {
        this.stringBoundary.lastIndex = i;
        const boundary = this.stringBoundary.exec(text);
        if (!boundary) return true;
        i = boundary.index;
      }
      if (!this.step(text.charCodeAt(i))) return false;
    }
    return !this.error;
  }

  finish(): JsonStreamResult {
    if (!this.error) {
      try { this.pushText(this.decoder.decode()); } catch { this.fail('invalid UTF-8'); }
    }
    if (!this.error && this.mode === 'NUM') {
      if (this.numTerminal()) this.valueDone(); else this.fail('incomplete number');
    }
    if (!this.error && this.mode !== 'DONE') this.fail('incomplete document');
    return {
      valid: this.error === null,
      error: this.error ?? undefined,
      topLevelKeys: [...this.topKeys],
      assetIsObject: this.assetObject,
      assetVersion: this.version,
    };
  }

  private fail(message: string): false {
    if (!this.error) this.error = message;
    return false;
  }

  private numTerminal() {
    return this.num === 'zero' || this.num === 'int' || this.num === 'frac' || this.num === 'exp';
  }

  private valueDone() {
    this.mode = this.stack.length === 0 ? 'DONE' : 'AFTER';
  }

  private close(kind: 'o' | 'a'): boolean {
    if (this.stack.pop() !== kind) return this.fail('mismatched container');
    this.keys.pop();
    this.valueDone();
    return true;
  }

  private startString(isKey: boolean) {
    this.mode = 'STR';
    this.isKey = isKey;
    this.keyBuf = '';
    this.captureBuf = '';
    this.captureSimple = true;
    // asset.version: root object -> key "asset" -> object -> key "version" -> string value
    this.capture = !isKey && this.stack.length === 2 && this.stack[0] === 'o' && this.stack[1] === 'o'
      && this.keys[0] === 'asset' && this.keys[1] === 'version';
  }

  private endString() {
    if (this.isKey) {
      if (this.keyBuf.length > MAX_KEY) this.keyBuf = this.keyBuf.slice(0, MAX_KEY);
      this.keys[this.keys.length - 1] = this.keyBuf;
      if (this.stack.length === 1 && this.topKeys.size < 128) this.topKeys.add(this.keyBuf);
      this.mode = 'C';
      return;
    }
    if (this.capture && this.captureSimple) this.version = this.captureBuf;
    this.capture = false;
    this.valueDone();
  }

  private startValue(c: number): boolean {
    if (this.stack.length === 1 && this.keys[0] === 'asset') { this.assetObject = false; this.version = null; }
    if (this.stack.length === 2 && this.keys[0] === 'asset' && this.keys[1] === 'version') this.version = null;
    if (this.stack.length === 0 && c !== 0x7b) return this.fail('top-level value must be an object');
    if (c === 0x7b) {
      if (this.stack.length >= MAX_DEPTH) return this.fail('nesting too deep');
      this.stack.push('o'); this.keys.push(''); this.mode = 'K';
      if (this.stack.length === 2 && this.stack[0] === 'o' && this.keys[0] === 'asset') this.assetObject = true;
      return true;
    }
    if (c === 0x5b) {
      if (this.stack.length >= MAX_DEPTH) return this.fail('nesting too deep');
      this.stack.push('a'); this.keys.push(''); this.mode = 'VA'; return true;
    }
    if (c === 0x22) { this.startString(false); return true; }
    if (c === 0x2d) { this.mode = 'NUM'; this.num = 'sign'; return true; }
    if (c === 0x30) { this.mode = 'NUM'; this.num = 'zero'; return true; }
    if (c >= 0x31 && c <= 0x39) { this.mode = 'NUM'; this.num = 'int'; return true; }
    if (c === 0x74) { this.mode = 'LIT'; this.lit = 'true'; this.litPos = 1; return true; }
    if (c === 0x66) { this.mode = 'LIT'; this.lit = 'false'; this.litPos = 1; return true; }
    if (c === 0x6e) { this.mode = 'LIT'; this.lit = 'null'; this.litPos = 1; return true; }
    return this.fail('unexpected character');
  }

  private numStep(c: number): boolean {
    const digit = c >= 0x30 && c <= 0x39;
    const exp = c === 0x65 || c === 0x45;
    switch (this.num) {
      case 'sign':
        if (c === 0x30) { this.num = 'zero'; return true; }
        if (digit) { this.num = 'int'; return true; }
        return this.fail('bad number');
      case 'zero':
        if (c === 0x2e) { this.num = 'dot'; return true; }
        if (exp) { this.num = 'e'; return true; }
        break;
      case 'int':
        if (digit) return true;
        if (c === 0x2e) { this.num = 'dot'; return true; }
        if (exp) { this.num = 'e'; return true; }
        break;
      case 'dot':
        if (digit) { this.num = 'frac'; return true; }
        return this.fail('bad number');
      case 'frac':
        if (digit) return true;
        if (exp) { this.num = 'e'; return true; }
        break;
      case 'e':
        if (c === 0x2b || c === 0x2d) { this.num = 'esign'; return true; }
        if (digit) { this.num = 'exp'; return true; }
        return this.fail('bad number');
      case 'esign':
        if (digit) { this.num = 'exp'; return true; }
        return this.fail('bad number');
      case 'exp':
        if (digit) return true;
        break;
    }
    // The character is not part of the number: finish it and re-process the character.
    if (!this.numTerminal()) return this.fail('bad number');
    this.valueDone();
    return this.step(c);
  }

  private appendDecoded(value: string) {
    if (this.isKey && this.keyBuf.length <= MAX_KEY) this.keyBuf += value;
    else if (this.capture && this.captureBuf.length < 64) this.captureBuf += value;
  }

  private step(c: number): boolean {
    switch (this.mode) {
      case 'STR':
        if (c === 0x22) { this.endString(); return true; }
        if (c === 0x5c) { this.mode = 'ESC'; return true; }
        if (c < 0x20) return this.fail('control character in string');
        if (this.isKey) { if (this.keyBuf.length <= MAX_KEY) this.keyBuf += String.fromCharCode(c); }
        else if (this.capture && this.captureBuf.length < 64) this.captureBuf += String.fromCharCode(c);
        return true;
      case 'ESC':
        if (c === 0x75) { this.mode = 'HEX'; this.hexCount = 0; this.hexValue = 0; return true; }
        if (c === 0x22 || c === 0x5c || c === 0x2f || c === 0x62 || c === 0x66 || c === 0x6e || c === 0x72 || c === 0x74) {
          this.mode = 'STR';
          const decoded = JSON.parse('\"\\' + String.fromCharCode(c) + '\"');
          this.appendDecoded(decoded);
          return true;
        }
        return this.fail('bad escape');
      case 'HEX': {
        const hex = (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
        if (!hex) return this.fail('bad unicode escape');
        this.hexValue = this.hexValue * 16 + parseInt(String.fromCharCode(c), 16);
        this.hexCount += 1;
        if (this.hexCount === 4) { this.mode = 'STR'; this.appendDecoded(String.fromCharCode(this.hexValue)); }
        return true;
      }
      case 'NUM': return this.numStep(c);
      case 'LIT':
        if (c !== this.lit.charCodeAt(this.litPos)) return this.fail('bad literal');
        this.litPos += 1;
        if (this.litPos === this.lit.length) this.valueDone();
        return true;
      default: break;
    }
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) return true;
    switch (this.mode) {
      case 'DONE': return this.fail('trailing content');
      case 'V': return this.startValue(c);
      case 'VA': return c === 0x5d ? this.close('a') : this.startValue(c);
      case 'K':
        if (c === 0x7d) return this.close('o');
        if (c === 0x22) { this.startString(true); return true; }
        return this.fail('expected key');
      case 'K2':
        if (c === 0x22) { this.startString(true); return true; }
        return this.fail('expected key');
      case 'C':
        if (c === 0x3a) { this.mode = 'V'; return true; }
        return this.fail('expected colon');
      case 'AFTER': {
        const top = this.stack[this.stack.length - 1];
        if (top === 'o') {
          if (c === 0x2c) { this.mode = 'K2'; return true; }
          if (c === 0x7d) return this.close('o');
        } else {
          if (c === 0x2c) { this.mode = 'V'; return true; }
          if (c === 0x5d) return this.close('a');
        }
        return this.fail('expected comma or closing bracket');
      }
      default: return this.fail('invalid state');
    }
  }
}

/** Convenience: validate one complete byte buffer. */
export function validateJsonBytes(bytes: Uint8Array): JsonStreamResult {
  const validator = new JsonStreamValidator();
  validator.pushBytes(bytes);
  return validator.finish();
}

