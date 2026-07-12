import { buildGatherTwiml, buildHangupTwiml } from './twiml.util';

describe('twiml.util', () => {
  describe('buildGatherTwiml', () => {
    it('embeds the say text and gather action url', () => {
      const xml = buildGatherTwiml('Hi there!', 'https://api.example.com/webhooks/voice/gather?leadId=lead-1&turn=2');
      expect(xml).toContain('<Say>Hi there!</Say>');
      expect(xml).toContain('action="https://api.example.com/webhooks/voice/gather?leadId=lead-1&amp;turn=2"');
      expect(xml).toContain('input="speech"');
    });

    it('escapes XML-significant characters in agent-generated text', () => {
      const xml = buildGatherTwiml('Pricing is $10 & up <for now> — "great deal"', 'https://example.com/gather');
      expect(xml).not.toContain('& up');
      expect(xml).toContain('&amp; up');
      expect(xml).toContain('&lt;for now&gt;');
      expect(xml).toContain('&quot;great deal&quot;');
    });
  });

  describe('buildHangupTwiml', () => {
    it('says the closing line and hangs up', () => {
      const xml = buildHangupTwiml('Goodbye!');
      expect(xml).toContain('<Say>Goodbye!</Say>');
      expect(xml).toContain('<Hangup/>');
    });

    it('escapes ampersands so the XML stays well-formed', () => {
      const xml = buildHangupTwiml('Thanks & goodbye');
      expect(xml).toContain('Thanks &amp; goodbye');
    });
  });
});
