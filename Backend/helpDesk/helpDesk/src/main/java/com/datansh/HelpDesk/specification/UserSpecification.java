package com.datansh.HelpDesk.specification;

import com.datansh.HelpDesk.entity.User;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class UserSpecification {

    public static Specification<User> filter(String search,
                                             String role,
                                             Boolean isActive,
                                             Boolean isSupportStaff) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), pattern);
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), pattern);
                predicates.add(cb.or(nameMatch, emailMatch));
            }

            if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
                predicates.add(cb.equal(cb.upper(root.get("role").get("name")), role.trim().toUpperCase()));
            }

            if (isActive != null) {
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }

            if (Boolean.TRUE.equals(isSupportStaff)) {
                predicates.add(root.get("role").get("name").in(List.of("SUPPORT_AGENT", "SUPPORT_MANAGER", "AGENT")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
