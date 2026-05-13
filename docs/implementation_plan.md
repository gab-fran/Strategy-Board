# Update Match Scout to Use FIRST API for Matches

This plan outlines the steps to modify the Match Scout workflow, allowing users to select a Match Type, fetch the team's schedule from the FIRST API, and automatically populate the Match, Alliance, and Station fields.

## Background Context
Currently, the Match Scout requires users to manually input the Match Number, Alliance, and Station. To reduce manual entry errors, we will integrate with the FIRST API to fetch a team's schedule for a specific event and match type.

## User Review Required
> [!IMPORTANT]
> **Offline Support:** Since Strategy Board is designed to be offline-first (used in arenas with bad connection), we need to ensure users can still scout if the FIRST API is unreachable.
> **Question for User:** If the FIRST API is offline or the matches fail to load, should we allow the user to manually type the Match Number, Alliance, and Station as they do today? 

> [!WARNING]
> **Surrogate Matches:** Teams occasionally play surrogate matches. 
> **Question for User:** Do you want surrogate matches to be labeled specifically in the dropdown, or just display the match number?

## Proposed Changes

---

### UI Layer (`index.html`)

#### [MODIFY] `index.html`
- **Match Type Select:** Add a new `<select>` field for Match Type (`Practice`, `Qualification`, `Playoff`) before the Match field.
- **Match Field:** Change the `<input type="text">` to a `<select>` or a datalist-driven input. Given the offline requirement, we might want to make it an input with a datalist or keep the select but add a "Manual Entry" toggle. (A select with an "Other/Manual" option is often robust).

---

### Data Layer (`first.ts`)

#### [MODIFY] `first.ts`
- **Add API Types:** Introduce `FIRSTMatch` and `FIRSTMatchTeam` types to model the `/matches/` endpoint response.
- **Add `getTeamMatches` Method:** Add a method to fetch matches for a team given `season`, `eventCode`, `teamNumber`, and `tournamentLevel`.

---

### Controller Layer (`scoutView.ts`)

#### [MODIFY] `scoutView.ts`
- **State Management:** Store the fetched matches in a local variable.
- **Event Listeners:** 
  - Add an event listener to the "Match Type" select.
  - When Match Type changes or a valid Team Number is verified, call `FIRSTService.getTeamMatches()`.
- **UI Updates:**
  - Populate the "Match" dropdown with the fetched matches.
  - When a user selects a match from the dropdown, find the team in the match's `teams` array.
  - Auto-select the `Alliance` and `Station` fields based on the team's `station` string (e.g., "Red1" -> Alliance: Red, Station: 1).

## Verification Plan

### Automated Tests
- Build the app with `bun run build` to verify TypeScript compilation.
- Run `bun run lint`.

### Manual Verification
- Select an event and enter a valid team number.
- Choose "Qualification" as the match type.
- Verify the dropdown populates with the team's matches.
- Select a match and verify Alliance and Station are auto-populated correctly.
- Test offline behavior (if FIRST API fails, ensure manual entry is still possible).
