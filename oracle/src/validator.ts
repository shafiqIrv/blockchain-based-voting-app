import { SSOUserInfo } from "./sso";

export interface ValidationResult {
	isValid: boolean;
	reason?: string;
}

/**
 * Student Validator
 * Validates if a student is eligible to vote
 */
export class StudentValidator {
	/**
	 * Validate student eligibility for voting
	 */
	async validateStudent(userInfo: SSOUserInfo): Promise<ValidationResult> {
		// Check if student is active
		if (userInfo.status !== "active") {
			return {
				isValid: false,
				reason: `Student status is ${userInfo.status}. Only active students can vote.`,
			};
		}

		// Check if NIM is valid (basic format check)
		if (!this.isValidNIM(userInfo.nim)) {
			return {
				isValid: false,
				reason: "Invalid NIM format",
			};
		}

		// Additional validation rules can be added here:
		// - Check if student is from specific faculty
		// - Check if student has not voted before (handled by blockchain)
		// - Check enrollment year requirements
		// - etc.

		return {
			isValid: true,
		};
	}

	/**
	 * Basic NIM format validation
	 * ITB NIM format: XXXXXXXX (8 digits) or longer
	 */
	private isValidNIM(nim: string): boolean {
		// Basic validation: NIM should be at least 8 characters
		// and contain only numbers
		return /^\d{8,}$/.test(nim);
	}
}
