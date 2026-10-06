package com.datansh.HelpDesk.specification;

import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.TicketAssignment;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.enums.TicketStatus;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class TicketSpecification {

    public static Specification<Ticket> filter(String search,
                                               TicketStatus status,
                                               Long priorityId,
                                               Long categoryId,
                                               Boolean unassigned,
                                               User currentUser,
                                               String role) {
        return filter(search, status, priorityId, categoryId, unassigned, null, currentUser, role);
    }

    public static Specification<Ticket> filter(String search,
                                               TicketStatus status,
                                               Long priorityId,
                                               Long categoryId,
                                               Boolean unassigned,
                                               String agentEmail,
                                               User currentUser,
                                               String role) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(titleMatch, descMatch));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (priorityId != null) {
                predicates.add(cb.equal(root.get("ticketPriority").get("priorityId"), priorityId));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("categoryId"), categoryId));
            }

            if ("REQUESTER".equals(role)) {
                predicates.add(cb.equal(root.get("requestor"), currentUser));
            } else if ("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) {
                // Agents only see tickets actively assigned to them
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<TicketAssignment> ta = subquery.from(TicketAssignment.class);
                subquery.select(ta.get("ticketId").get("ticketId"))
                        .where(cb.equal(ta.get("assignedTo"), currentUser),
                               cb.isTrue(ta.get("isActive")));
                predicates.add(root.get("ticketId").in(subquery));
            } else if ("ADMIN".equals(role) || "SUPPORT_MANAGER".equals(role)) {
                if (Boolean.TRUE.equals(unassigned)) {
                    Subquery<Long> subquery = query.subquery(Long.class);
                    Root<TicketAssignment> ta = subquery.from(TicketAssignment.class);
                    subquery.select(ta.get("ticketId").get("ticketId"))
                            .where(cb.isTrue(ta.get("isActive")));
                    predicates.add(cb.not(root.get("ticketId").in(subquery)));
                } else if (agentEmail != null && !agentEmail.isBlank()) {
                    Subquery<Long> subquery = query.subquery(Long.class);
                    Root<TicketAssignment> ta = subquery.from(TicketAssignment.class);
                    subquery.select(ta.get("ticketId").get("ticketId"))
                            .where(cb.equal(cb.lower(ta.get("assignedTo").get("email")), agentEmail.trim().toLowerCase()),
                                   cb.isTrue(ta.get("isActive")));
                    predicates.add(root.get("ticketId").in(subquery));
                }
            } else {
                predicates.add(cb.disjunction());
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
