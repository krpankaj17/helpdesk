package com.datansh.HelpDesk.dto;

public record UserSummaryResponse(
        long totalUsers,
        long activeUsers,
        long inactiveUsers,
        long supportStaff
) {
}
