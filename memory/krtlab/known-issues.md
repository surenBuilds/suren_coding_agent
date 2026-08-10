# KrtLab Known Issues & Edge Cases

## AI Mentor Persistence Issue
- **Symptom**: When user refreshes or closes the session, the AI Mentor conversation state or intelligence parameters sometimes fail to sync back to Supabase if the network is sluggish.
- **Root Cause**: `syncToSupabase` in `src/lib/persistence.ts` lacks retry handling on initial load or misses triggering `updateIntelligenceState` when auth state resolves asynchronously.
- **Resolution Strategy**: Ensure optimistic UI updates in LocalStorage first, then debounce sync to Supabase with proper error retry.
