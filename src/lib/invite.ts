/**
 * Stub function for inviting a single by email (MVP)
 * TODO: Replace with actual API call to sponsor-single edge function
 */
export async function inviteSingleByEmail(email: string): Promise<{ success: boolean; message: string }> {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: 'Please enter a valid email address' };
    }

    // For MVP: just log and return success
    console.log('Invite single by email (stub):', email);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { success: true, message: 'Invite sent.' };
}

