# Email to GPT Implementation Team

**Subject:** Bangkok Massage Intelligence - Integration Instructions

---

Hi GPT Team,

Bangkok Massage Intelligence is now live and ready for integration. Here's what you need to know:

## Quick Integration

**No new function needed!** Use the existing `invoke_precog` function with `precog="bkk_massage"`.

### Example Call

```json
{
  "name": "invoke_precog,
  "arguments": {
    "precog": "bkk_massage",
    "content_source": "inline",
    "content": "Find a safe massage in Asok",
    "task": "district_aware_ranking",
    "region": "Asok"
  }
}
```

## What You Need to Do

1. **Update System Prompt** - Add Bangkok massage section (see attached)
2. **Test** - Try: "Find a safe massage in Asok"
3. **That's it!** - Same function, same pattern as schema/home precogs

## Response Data

Returns merged shop data including:
- Shop names and addresses
- Ratings and review counts
- Prettiest women mentions (from reviews)
- Pricing information
- Line usernames
- Websites
- Safety signals and verification status

## Documentation

Full instructions attached: `GPT_TEAM_FINAL_INSTRUCTIONS.md`

## Questions?

Let me know if you need anything!

---

**Attachments:**
- `GPT_TEAM_FINAL_INSTRUCTIONS.md` - Complete integration guide

