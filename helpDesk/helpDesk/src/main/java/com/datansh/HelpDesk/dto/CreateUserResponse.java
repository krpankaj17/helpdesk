package com.datansh.HelpDesk.dto;

import java.util.UUID;

public record CreateUserResponse(UUID userPublicId,
                                 String name,
                                 String email,
                                 Boolean isActive){
}
